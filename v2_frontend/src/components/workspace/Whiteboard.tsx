"use client";

import { forwardRef, useImperativeHandle, useState, useEffect, useRef } from "react";
import axios from "axios";
import { Loader2, Users } from "lucide-react";
import { Tldraw, Editor } from "tldraw";
import "tldraw/tldraw.css";
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

const Whiteboard = forwardRef<WhiteboardRef, WhiteboardProps>(({ workspaceId, token, ydoc, provider, activeFile, initialContent, userRole }, ref) => {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [connected, setConnected] = useState(false);

  useImperativeHandle(ref, () => ({
    getSnapshot: () => {
      if (!editor) return "";
      return JSON.stringify(editor.store.getStoreSnapshot());
    },
    broadcastUpdate: (snapshot: string) => {
      if (ydoc && activeFile) {
        // We set the snapshot string in the Yjs map. 
        // This instantly synchronizes it to all other connected clients!
        const ymap = ydoc.getMap(`whiteboard-sync-${activeFile}`);
        ymap.set("latest_snapshot", snapshot);
      }
    }
  }));

  // 2. Setup Yjs WebSocket for broadcasting manual saves
  useEffect(() => {
    if (!ydoc || !provider || !activeFile) return;
    
    setConnected(provider.wsconnected);
    const handleStatus = (event: { status: string }) => setConnected(event.status === "connected");
    provider.on("status", handleStatus);

    const ymap = ydoc.getMap(`whiteboard-sync-${activeFile}`);
    const observer = (event: any) => {
      if (event.keysChanged.has("latest_snapshot")) {
        const newSnapshotStr = ymap.get("latest_snapshot") as string;
        if (newSnapshotStr && editor) {
          try {
            editor.store.loadStoreSnapshot(JSON.parse(newSnapshotStr));
          } catch (e) {
            console.error("Failed to sync remote whiteboard save", e);
          }
        }
      }
    };
    ymap.observe(observer);

    return () => {
      provider.off("status", handleStatus);
      ymap.unobserve(observer);
    };
  }, [ydoc, provider, editor, activeFile]);

  const handleMount = (editorInstance: Editor) => {
    if (initialContent) {
      try {
        editorInstance.store.loadStoreSnapshot(JSON.parse(initialContent));
      } catch (e) {
        console.error("Failed to load whiteboard snapshot", e);
      }
    }
    setEditor(editorInstance);
  };

  if (!activeFile) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-[#1e1e1e] text-zinc-500">
        <p className="text-sm font-semibold">No board selected</p>
        <p className="text-xs mt-1 text-zinc-600">Select or create a board to start drawing</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative" style={{ height: "100%", width: "100%" }}>
      {/* Sync Status Overlay */}
      <div className="absolute top-4 left-4 z-[999] flex flex-col gap-2 pointer-events-none">
        <div className={`px-2 py-1 text-xs rounded-full border flex items-center gap-2 shadow-sm backdrop-blur-sm transition-colors ${connected ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' : 'bg-orange-500/20 text-orange-500 border-orange-500/30'}`}>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'}`}></div>
          {connected ? 'WebSocket Synced' : 'Connecting...'}
        </div>

      </div>

      <Tldraw inferDarkMode className="w-full h-full" onMount={handleMount} isReadonly={userRole === "viewer"} />
    </div>
  );
});

Whiteboard.displayName = "Whiteboard";
export default Whiteboard;
