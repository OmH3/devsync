"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

// UI Components
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { FileCode2, Paintbrush, Play, Mic, FolderOpen, ArrowLeft, Copy, Users, TerminalSquare, Save } from "lucide-react";
import dynamic from "next/dynamic";
import axios from "axios";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

// Dynamically import components so they don't break SSR
const CodeEditor = dynamic(() => import("@/components/workspace/CodeEditor"), { ssr: false });
const Whiteboard = dynamic(() => import("@/components/workspace/Whiteboard"), { ssr: false });
import FileTree from "@/components/workspace/FileTree";
const DocumentEditor = dynamic(() => import("@/components/workspace/DocumentEditor"), { ssr: false });
import AudioRoom from "@/components/workspace/AudioRoom";

export default function WorkspaceRoom() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const { token, userId } = useAuthStore();
  
  const [activeView, setActiveView] = useState<'overview' | 'code' | 'whiteboard' | 'documents'>('overview');
  
  const [activeFile, setActiveFile] = useState("");
  const [activeDoc, setActiveDoc] = useState("");
  const [activeBoard, setActiveBoard] = useState("");
  const [boards, setBoards] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const docEditorRef = useRef<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [activeUsers, setActiveUsers] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [userRole, setUserRole] = useState("viewer");
  const [members, setMembers] = useState<any[]>([]);

  // Global Yjs Provider
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  useEffect(() => {
    if (!token || !userId) return;
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // Fetch RBAC Role immediately on mount
    const fetchRole = async () => {
      try {
        const res = await axios.get(`/api/workspaces/role?workspace_id=${workspaceId}`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        const role: string = res.data?.data?.role ?? "viewer";
        setUserRole(role);
        
        // If they are the owner, fetch the members list for the Team Management UI
        if (role === "owner") {
          const memRes = await axios.get(`/api/workspaces/members?workspace_id=${workspaceId}`, { 
            headers: { Authorization: `Bearer ${token}` } 
          });
          setMembers(memRes.data?.data || []);
        }
      } catch (e) {
        console.error("Failed to fetch workspace role", e);
      }
    };
    fetchRole();

    const roomParam = `ws?workspace_id=${workspaceId}&token=${token}`;
    
    // Parse the API URL to get the host for the WebSocket
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    // If it's https, we use wss://, otherwise ws://
    const wsProtocol = apiUrl.startsWith("https") ? "wss:" : "ws:";
    const wsHost = apiUrl.replace(/^https?:\/\//, "");
    
    // Connect DIRECTLY to the Oracle backend for WebSockets, bypassing Vercel entirely!
    const provider = new WebsocketProvider(`${wsProtocol}//${wsHost}`, roomParam, ydoc);
    providerRef.current = provider;

    provider.awareness.setLocalState({ userId });

    const handleAwarenessChange = () => {
      const states = Array.from(provider.awareness.getStates().values());
      const uniqueUsers = new Set(
        states.map((s: any) => s?.userId).filter(Boolean)
      );
      setActiveUsers(uniqueUsers.size || 1);
    };
    provider.awareness.on("change", handleAwarenessChange);

    return () => {
      provider.awareness.off("change", handleAwarenessChange);
      provider.disconnect();
      ydoc.destroy();
    };
  }, [workspaceId, token, userId]);


  // Terminal & Run Code states
  const editorRef = useRef<any>(null);
  const whiteboardRef = useRef<any>(null);
  const [terminalOutput, setTerminalOutput] = useState<{ out: string; err: string } | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Protection: Kick them out if they refresh without a token
  useEffect(() => {
    setMounted(true);
    if (!token) {
      router.push("/");
    }
  }, [token, router]);

  const [isSaving, setIsSaving] = useState(false);

  
  
  const handleChangeRole = async (targetUserId: string, newRole: string) => {
    try {
      await axios.put(`/api/workspaces/members/role`, {
        workspace_id: workspaceId,
        user_id: targetUserId,
        role: newRole
      }, { headers: { Authorization: `Bearer ${token}` } });
      setMembers(members.map(m => m.id === targetUserId ? { ...m, role: newRole } : m));
    } catch (e: any) {
      alert(e.response?.data?.error || "Failed to update role");
    }
  };

  const handleSaveWhiteboard = async () => {
    if (!whiteboardRef.current || !activeBoard) return;
    setIsSaving(true);
    const data = whiteboardRef.current.getSnapshot();
    try {
      await axios.put("/api/files", {
        workspace_id: workspaceId,
        name: activeBoard,
        content: data
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Broadcast the new snapshot to all other users immediately
      whiteboardRef.current.broadcastUpdate(data);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to save whiteboard to Database");
    } finally {
      setTimeout(() => setIsSaving(false), 1000);
    }
  };

  const handleSaveDoc = async () => {
    if (!docEditorRef.current || !activeDoc) return;
    setIsSaving(true);
    const html = docEditorRef.current.getHTML();
    try {
      await axios.put("/api/files", {
        workspace_id: workspaceId,
        name: activeDoc,
        content: html
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to save document");
    } finally {
      setTimeout(() => setIsSaving(false), 1000);
    }
  };

  const handleSaveFile = async () => {
    if (!editorRef.current || !activeFile) return;
    setIsSaving(true);
    const code = editorRef.current.getCode();
    try {
      await axios.put("/api/files", {
        workspace_id: workspaceId,
        name: activeFile,
        content: code
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Optionally show a toast or success indicator here
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to save file to Database");
    } finally {
      setTimeout(() => setIsSaving(false), 1000);
    }
  };

  const handleRunCode = async () => {
    if (!editorRef.current) return;
    const code = editorRef.current.getCode();
    if (!code.trim()) return;

    setIsRunning(true);
    setTerminalOutput(null);

    const ext = activeFile.split('.').pop() || "python";
    const language = ext === "py" ? "python" : ext;

    try {
      const { data } = await axios.post("/api/run", {
        workspace_id: workspaceId,
        language,
        code
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const result = data.data || {};
      setTerminalOutput({ out: result.output || "", err: result.error || "" });
    } catch (err: any) {
      setTerminalOutput({ out: "", err: err.response?.data?.error || "Failed to execute code" });
    } finally {
      setIsRunning(false);
    }
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(workspaceId);
    // Could replace with shadcn toast later
  };

  // During SSR and first paint, render nothing — prevents hydration mismatch
  if (!mounted || !token) return null;

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* UNIVERSAL PERSISTENT HEADER */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white" onClick={() => activeView === 'overview' ? router.push('/workspaces') : setActiveView('overview')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> {activeView === 'overview' ? 'Back' : 'Dashboard'}
          </Button>
          <div className="h-4 w-px bg-zinc-800 mx-2"></div>
          <span className="font-semibold text-white capitalize">
            {activeView === 'overview' ? 'Workspace Overview' : activeView === 'code' ? 'Code Editor' : activeView === 'whiteboard' ? 'Architecture Board' : 'Documents'}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Active Users Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-xs font-medium text-zinc-300 shadow-sm mr-2" title={`${activeUsers} people online in this workspace`}>
            <div className="relative flex h-2 w-2 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
            <Users className="h-3.5 w-3.5 text-zinc-400" />
            <span>{activeUsers} Online</span>
          </div>

          {/* Persistent Audio Room Component */}
          <AudioRoom workspaceId={workspaceId} token={token} userId={userId ?? ""} />

          
          {activeView === 'whiteboard' && (
            <Button size="sm" variant="outline" className={`bg-zinc-900 border-zinc-700 hover:bg-zinc-800 transition-colors ${isSaving ? 'text-emerald-400 border-emerald-500/50' : 'text-zinc-300 hover:text-white'}`} onClick={handleSaveWhiteboard} disabled={!activeBoard || isSaving || userRole === "viewer"}>
              <Save className="h-4 w-4 mr-2" /> 
              {isSaving ? 'Saved!' : 'Save Board'}
            </Button>
          )}

          {activeView === 'documents' && (
            <Button size="sm" variant="outline" className={`bg-zinc-900 border-zinc-700 hover:bg-zinc-800 transition-colors ${isSaving ? 'text-emerald-400 border-emerald-500/50' : 'text-zinc-300 hover:text-white'}`} onClick={handleSaveDoc} disabled={!activeDoc || isSaving || userRole === "viewer"}>
              <Save className="h-4 w-4 mr-2" /> 
              {isSaving ? 'Saved!' : 'Save Document'}
            </Button>
          )}
          {activeView === 'code' && (
            <>
              <Button size="sm" variant="outline" className={`bg-zinc-900 border-zinc-700 hover:bg-zinc-800 transition-colors ${isSaving ? 'text-emerald-400 border-emerald-500/50' : 'text-zinc-300 hover:text-white'}`} onClick={handleSaveFile} disabled={!activeFile || isSaving || userRole === "viewer"}>
                <Save className="h-4 w-4 mr-2" /> 
                {isSaving ? 'Saved!' : 'Save'}
              </Button>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-semibold" onClick={handleRunCode} disabled={isRunning || !activeFile || userRole === "viewer"}>
                <Play className={`h-4 w-4 mr-2 ${isRunning ? 'animate-ping' : ''}`} /> 
                {isRunning ? 'Running...' : 'Run Code'}
              </Button>
            </>
          )}
        </div>
      </header>

      {/* DYNAMIC MAIN CONTENT AREA */}
      <div className="flex-1 overflow-hidden relative">
        {activeView === 'overview' && (
          <div className="w-full h-full overflow-y-auto bg-zinc-950">
            <div className="max-w-6xl mx-auto p-8">
              <div className="mb-10">
                <h1 className="text-3xl font-bold text-white mb-2">Workspace Overview</h1>
                <p className="text-zinc-400">Select a collaborative service to jump in.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Code Editor */}
                <div 
                  className="group relative overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800 p-6 transition-all hover:bg-zinc-800/80 hover:border-blue-500/50 cursor-pointer flex flex-col items-center text-center"
                  onClick={() => setActiveView('code')}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="h-14 w-14 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <FileCode2 className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Code Editor</h3>
                  <p className="text-sm text-zinc-400">Collaborative coding with real-time execution and file tree.</p>
                </div>

                {/* Whiteboard */}
                <div 
                  className="group relative overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800 p-6 transition-all hover:bg-zinc-800/80 hover:border-purple-500/50 cursor-pointer flex flex-col items-center text-center"
                  onClick={() => setActiveView('whiteboard')}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="h-14 w-14 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Paintbrush className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Architecture Board</h3>
                  <p className="text-sm text-zinc-400">Infinite visual canvas for diagramming and brainstorming.</p>
                </div>

                {/* Documents */}
                <div 
                  className="group relative overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800 p-6 transition-all hover:bg-zinc-800/80 hover:border-yellow-500/50 cursor-pointer flex flex-col items-center text-center"
                  onClick={() => setActiveView('documents')}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="h-14 w-14 rounded-full bg-yellow-500/10 text-yellow-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <FolderOpen className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Documents</h3>
                  <p className="text-sm text-zinc-400">Real-time collaborative text editing and notes.</p>
                </div>
              </div>

              <div className="mt-12 pt-12 border-t border-zinc-800/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Share Panel */}
                  {userRole === "owner" && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-8 w-8 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center">
                        <Users className="h-4 w-4" />
                      </div>
                      <h3 className="text-lg font-semibold text-white">Invite Team</h3>
                    </div>
                    <p className="text-sm text-zinc-400 mb-4">Share this code with others so they can join this workspace.</p>
                    <div className="flex bg-black rounded-md p-2 items-center border border-zinc-800">
                      <span className="text-xs text-zinc-500 truncate flex-1 font-mono">{workspaceId}</span>
                      <Button variant="ghost" size="icon" onClick={copyInvite} className="h-6 w-6 ml-2 text-zinc-400 hover:text-white">
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  )}
                </div>
              </div>
            </div>

          {userRole === "owner" && (
            <div className="max-w-6xl mx-auto p-8 pt-0">
              <h2 className="text-xl font-bold text-white mb-4 mt-8 border-t border-zinc-800 pt-8">Team Management</h2>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm text-zinc-400">
                  <thead className="bg-zinc-950/50 border-b border-zinc-800 text-xs uppercase font-semibold text-zinc-500">
                    <tr>
                      <th className="px-6 py-4">User Email</th>
                      <th className="px-6 py-4">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m: any) => (
                      <tr key={m.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/20 transition-colors">
                        <td className="px-6 py-4 font-medium text-zinc-200">{m.email}</td>
                        <td className="px-6 py-4">
                          {m.role === 'owner' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              Owner
                            </span>
                          ) : (
                            <select 
                              value={m.role}
                              onChange={(e) => handleChangeRole(m.id, e.target.value)}
                              className="bg-zinc-950 border border-zinc-700 text-zinc-300 text-xs rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-32 p-2 outline-none"
                            >
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                    {members.length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-6 py-8 text-center text-zinc-500">Loading members...</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          </div>
        )}

        {activeView === 'code' && (
          <ResizablePanelGroup direction="horizontal" className="h-full w-full">
            {/* Left Panel: File Tree (Sidebar) */}
            <ResizablePanel defaultSize={18} minSize={12} maxSize={35} className="border-r border-zinc-800 bg-zinc-900/40 flex flex-col">
              <FileTree userRole={userRole} 
                workspaceId={workspaceId} 
                token={token} 
                activeFile={activeFile} 
                setActiveFile={setActiveFile} 
                files={files}
                setFiles={setFiles}
                excludeExtensions={['.doc', '.md', '.txt', '.board', '.tldraw']}
                ydoc={ydocRef.current}
              />
            </ResizablePanel>
            
            <ResizableHandle className="bg-zinc-800 w-1 transition-colors hover:bg-blue-500" />

            {/* Center Panel: Code Editor + Terminal */}
            <ResizablePanel defaultSize={82} className="flex flex-col bg-[#1e1e1e]">
              <ResizablePanelGroup direction="vertical" className="h-full w-full">
                <ResizablePanel defaultSize={70} className="flex flex-col">
                  <div className="h-10 border-b border-zinc-800 bg-zinc-900 flex items-center px-4 text-sm text-zinc-300 gap-2 shrink-0">
                    <FileCode2 className="h-4 w-4 text-zinc-500" /> {activeFile}
                  </div>
                  <div className="flex-1 w-full relative">
                    <CodeEditor userRole={userRole} 
                      key={activeFile}
                      ref={editorRef}
                      workspaceId={workspaceId} 
                      token={token} 
                      userId={userId ?? ""}
                      activeFile={activeFile} 
                      initialContent={files.find(f => f.name === activeFile)?.content || ""}
                      ydoc={ydocRef.current} provider={providerRef.current}
                    />
                  </div>
                </ResizablePanel>

                {terminalOutput !== null && (
                  <>
                    <ResizableHandle className="bg-zinc-800 h-1 transition-colors hover:bg-blue-500" />
                    <ResizablePanel defaultSize={30} minSize={10} className="flex flex-col bg-[#1e1e1e]">
                      <div className="h-10 border-b border-zinc-800 bg-zinc-900 flex items-center px-4 text-sm text-zinc-400 gap-2 shrink-0 font-mono">
                        <TerminalSquare className="h-4 w-4" /> Terminal Output
                        <div className="ml-auto text-xs opacity-50">Docker Sandbox</div>
                      </div>
                      <div className="flex-1 p-4 overflow-y-auto font-mono text-sm bg-black/40">
                        {terminalOutput.out && <pre className="text-zinc-300 whitespace-pre-wrap mb-2">{terminalOutput.out}</pre>}
                        {terminalOutput.err && <pre className="text-red-400 whitespace-pre-wrap">{terminalOutput.err}</pre>}
                        {!terminalOutput.out && !terminalOutput.err && <span className="text-zinc-600 italic">Program exited with no output.</span>}
                      </div>
                    </ResizablePanel>
                  </>
                )}
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}

        {activeView === 'whiteboard' && (
          <ResizablePanelGroup direction="horizontal" className="h-full w-full">
            <ResizablePanel defaultSize={18} minSize={12} maxSize={35} className="border-r border-zinc-800 bg-zinc-900/40 flex flex-col">
              <FileTree userRole={userRole} 
                workspaceId={workspaceId} 
                token={token} 
                activeFile={activeBoard} 
                setActiveFile={setActiveBoard} 
                files={boards} 
                setFiles={setBoards} 
                extensionFilter={['.tldraw', '.board']}
                ydoc={ydocRef.current}
              />
            </ResizablePanel>
            <ResizableHandle className="bg-zinc-800 w-1 hover:bg-yellow-500/50 transition-colors cursor-col-resize" />
            <ResizablePanel defaultSize={82} className="relative bg-[#121212]">
              <Whiteboard userRole={userRole} 
                key={activeBoard}
                ref={whiteboardRef}
                workspaceId={workspaceId} 
                token={token}
                ydoc={ydocRef.current} 
                provider={providerRef.current}
                activeFile={activeBoard}
                initialContent={boards.find((f: any) => f.name === activeBoard)?.content || ""}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}

        {activeView === 'documents' && (
          <ResizablePanelGroup direction="horizontal" className="h-full w-full">
            <ResizablePanel defaultSize={18} minSize={12} maxSize={35} className="border-r border-zinc-800 bg-zinc-900/40 flex flex-col">
              <FileTree userRole={userRole} 
                workspaceId={workspaceId} 
                token={token} 
                activeFile={activeDoc} 
                setActiveFile={setActiveDoc} 
                files={docs} 
                setFiles={setDocs} 
                extensionFilter={['.doc', '.md', '.txt']}
                ydoc={ydocRef.current}
              />
            </ResizablePanel>
            <ResizableHandle className="bg-zinc-800 w-1 hover:bg-yellow-500/50 transition-colors cursor-col-resize" />
            <ResizablePanel defaultSize={82} className="relative bg-[#121212]">
              <DocumentEditor userRole={userRole} 
                key={activeDoc}
                ref={docEditorRef}
                ydoc={ydocRef.current} 
                provider={providerRef.current}
                activeFile={activeDoc} 
                initialContent={docs.find((f: any) => f.name === activeDoc)?.content || ""} 
                userId={userId ?? ""}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
}
