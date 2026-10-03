"use client";

import { useRef, useState, forwardRef, useImperativeHandle, useEffect } from "react";
import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";

export interface CodeEditorRef {
  getCode: () => string;
}

interface CodeEditorProps {
  userRole?: string;
  workspaceId: string;
  token: string;
  userId: string;
  activeFile: string;
  initialContent: string;
  ydoc: Y.Doc | null;
  provider: WebsocketProvider | null;
}

const CodeEditor = forwardRef<CodeEditorRef, CodeEditorProps>(({ workspaceId, token, userId, activeFile, initialContent, ydoc, provider, userRole }, ref) => {
  const bindingRef = useRef<MonacoBinding | null>(null);
  const [connected, setConnected] = useState(false);

  const editorInstanceRef = useRef<any>(null);

  // Expose methods to the parent
  useImperativeHandle(ref, () => ({
    getCode: () => {
      if (!ydoc || !activeFile) return "";
      return ydoc.getText(activeFile).toString();
    }
  }));

  // Helper to safely destroy binding without triggering Yjs console errors
  const safeDestroyBinding = () => {
    if (bindingRef.current) {
      const ogError = console.error;
      console.error = () => {}; // Silence the Yjs event handler error
      try { bindingRef.current.destroy(); } catch (e) {}
      console.error = ogError;
      bindingRef.current = null;
    }
  };

  // 1. Sync connection status from global provider
  useEffect(() => {
    if (!provider) return;
    setConnected(provider.wsconnected);
    const handleStatus = (event: { status: string }) => setConnected(event.status === "connected");
    provider.on("status", handleStatus);
    return () => {
      provider.off("status", handleStatus);
    };
  }, [provider]);

  // 2. Setup MonacoBinding when editor mounts OR activeFile changes
  const bindEditor = () => {
    if (!editorInstanceRef.current || !ydoc || !provider || !activeFile) return;

    // Safely destroy old binding
    safeDestroyBinding();

    const editor = editorInstanceRef.current;
    const model = editor.getModel();
    if (!model) return;

    const yText = ydoc.getText(activeFile);
    
    // If the Yjs document is completely empty, it means this is a fresh load from the server.
    // We should seed it with the content from the PostgreSQL database!
    if (yText.length === 0 && initialContent) {
      yText.insert(0, initialContent);
    }

    bindingRef.current = new MonacoBinding(
      yText,
      model,
      new Set([editor]),
      provider.awareness
    );
  };

  useEffect(() => {
    bindEditor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile]);

  const handleEditorDidMount = (editor: any) => {
    editorInstanceRef.current = editor;
    bindEditor();
  };

  if (!activeFile) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-[#1e1e1e] text-zinc-500">
        <p className="text-sm font-semibold">No file selected</p>
        <p className="text-xs mt-1 text-zinc-600">Select or create a file to start coding</p>
      </div>
    );
  }

  const getLanguage = (filename: string) => {
    if (filename.endsWith('.py')) return 'python';
    if (filename.endsWith('.js')) return 'javascript';
    if (filename.endsWith('.ts')) return 'typescript';
    if (filename.endsWith('.cpp') || filename.endsWith('.cc')) return 'cpp';
    if (filename.endsWith('.java')) return 'java';
    if (filename.endsWith('.json')) return 'json';
    return 'plaintext';
  };

  return (
    <div className="w-full h-full relative">
      {connected ? (
        <div className="absolute top-2 right-4 z-10 px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30 flex items-center gap-2 shadow-xl backdrop-blur-sm pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          Synced
        </div>
      ) : (
        <div className="absolute top-2 right-4 z-10 px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-full border border-red-500/30 flex items-center gap-2 shadow-xl backdrop-blur-sm pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          Connecting...
        </div>
      )}

      <Editor
        height="100%"
        theme="vs-dark"
        path={activeFile}
        language={getLanguage(activeFile)}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          wordWrap: "on",
          readOnly: userRole === "viewer",
          padding: { top: 16 },
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  );
});

CodeEditor.displayName = "CodeEditor";
export default CodeEditor;
