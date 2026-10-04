"use client";

import { forwardRef, useImperativeHandle, useState, useEffect, useMemo } from "react";
import { Excalidraw, serializeAsJSON, restoreElements } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawImperativeAPI, BinaryFiles } from "@excalidraw/excalidraw/types";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

interface WhiteboardProps {
  userRole?: string;
  workspaceId: string;
  token: string;
  ydoc: Y.Doc | null;
  provider: WebsocketProvider | null;
  activeFile: string;
  initialContent: string;
}

export interface WhiteboardRef {
  getSnapshot: () => string;
  broadcastUpdate: (snapshot: string) => void;
}

type SceneElements = ReturnType<ExcalidrawImperativeAPI["getSceneElements"]>;

interface ParsedScene {
  elements: SceneElements;
  files: BinaryFiles;
  backgroundColor?: string;
}

/**
 * Safely parses a stored Excalidraw JSON string.
 * Returns an empty scene for empty content or legacy (tldraw) snapshots that
 * do not contain an `elements` array, so old boards simply open blank.
 */
function parseScene(raw: string): ParsedScene {
  const empty: ParsedScene = { elements: [] as unknown as SceneElements, files: {} };
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.elements)) return empty;
    return {
      elements: restoreElements(parsed.elements, null) as unknown as SceneElements,
      files: (parsed.files ?? {}) as BinaryFiles,
      backgroundColor: parsed.appState?.viewBackgroundColor,
    };
  } catch (e) {
    console.error("Failed to parse whiteboard snapshot", e);
    return empty;
  }
}

const Whiteboard = forwardRef<WhiteboardRef, WhiteboardProps>(({ ydoc, provider, activeFile, initialContent, userRole }, ref) => {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [connected, setConnected] = useState(false);

  // Parsed once per mounted board (the parent remounts us via key={activeBoard})
  const initialData = useMemo(() => {
    const scene = parseScene(initialContent);
    return {
      elements: scene.elements,
      files: scene.files,
      appState: scene.backgroundColor ? { viewBackgroundColor: scene.backgroundColor } : undefined,
      scrollToContent: true,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    getSnapshot: () => {
      if (!api) return "";
      try {
        return serializeAsJSON(api.getSceneElements(), api.getAppState(), api.getFiles(), "local");
      } catch (e) {
        console.error("Failed to serialize whiteboard", e);
        return "";
      }
    },
    broadcastUpdate: (snapshot: string) => {
      if (ydoc && activeFile) {
        // Setting the snapshot string in the Yjs map synchronizes it to all other clients instantly
        const ymap = ydoc.getMap(`whiteboard-sync-${activeFile}`);
        ymap.set("latest_snapshot", snapshot);
      }
    }
  }));

  // Yjs WebSocket: receive manual saves broadcast by other users + connection status
  useEffect(() => {
    if (!ydoc || !provider || !activeFile) return;

    setConnected(provider.wsconnected);
    const handleStatus = (event: { status: string }) => setConnected(event.status === "connected");
    provider.on("status", handleStatus);

    const ymap = ydoc.getMap(`whiteboard-sync-${activeFile}`);
    const observer = (event: Y.YMapEvent<unknown>) => {
      if (!event.keysChanged.has("latest_snapshot")) return;
      const newSnapshotStr = ymap.get("latest_snapshot") as string | undefined;
      if (!newSnapshotStr || !api) return;
      try {
        const scene = parseScene(newSnapshotStr);
        api.updateScene({ elements: scene.elements });
        if (Object.keys(scene.files).length > 0) {
          api.addFiles(Object.values(scene.files));
        }
      } catch (e) {
        console.error("Failed to sync remote whiteboard save", e);
      }
    };
    ymap.observe(observer);

    return () => {
      provider.off("status", handleStatus);
      ymap.unobserve(observer);
    };
  }, [ydoc, provider, api, activeFile]);

  if (!activeFile) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-[#1e1e1e] text-zinc-500">
        <p className="text-sm font-semibold">No board selected</p>
        <p className="text-xs mt-1 text-zinc-600">Select or create a board to start drawing</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 w-full h-full">
      {/* Sync Status Overlay */}
      <div className="absolute top-4 left-4 z-[999] flex flex-col gap-2 pointer-events-none">
        <div className={`px-2 py-1 text-xs rounded-full border flex items-center gap-2 shadow-sm backdrop-blur-sm transition-colors ${connected ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' : 'bg-orange-500/20 text-orange-500 border-orange-500/30'}`}>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'}`}></div>
          {connected ? 'WebSocket Synced' : 'Connecting...'}
        </div>
      </div>

      <Excalidraw
        excalidrawAPI={(instance) => setApi(instance)}
        initialData={initialData}
        theme="dark"
        viewModeEnabled={userRole === "viewer"}
      />
    </div>
  );
});

Whiteboard.displayName = "Whiteboard";
export default Whiteboard;
