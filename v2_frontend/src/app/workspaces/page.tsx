"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import axios from "axios";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FolderGit2, Plus, ArrowRight, LogOut, Copy } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  role: string;
  created_at: string;
}

export default function WorkspacesPage() {
  const router = useRouter();
  const { token, logout } = useAuthStore();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [joinWorkspaceId, setJoinWorkspaceId] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

  // 1. Protection: If no token exists, kick them back to login immediately
  useEffect(() => {
    if (!token) {
      router.push("/");
      return;
    }
    fetchWorkspaces();
  }, [token, router]);

  // 2. Fetch data from our Go Backend
  const fetchWorkspaces = async () => {
    try {
      const response = await axios.get("/api/workspaces", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setWorkspaces(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch workspaces", error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  // 3. Create a new Workspace
  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;

    try {
      const response = await axios.post(
        "/api/workspaces",
        { name: newWorkspaceName },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setWorkspaces([
          ...workspaces,
          {
            id: response.data.data.id,
            name: response.data.data.name,
            role: "owner",
            created_at: new Date().toISOString()
          }
        ]);
        setNewWorkspaceName("");
        setIsCreateDialogOpen(false);
      }
    } catch (error) {
      console.error("Failed to create workspace", error);
    }
  };

  // 4. Join an existing Workspace
  const handleJoinWorkspace = async () => {
    if (!joinWorkspaceId.trim()) return;

    try {
      const response = await axios.post(
        "/api/workspaces/join",
        { workspace_id: joinWorkspaceId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Fetch the updated list from the server to get the exact name
        fetchWorkspaces();
        setJoinWorkspaceId("");
        setIsJoinDialogOpen(false);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to join workspace");
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Loading your environments...</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans">
      {/* Top Navigation Bar */}
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <FolderGit2 className="h-8 w-8 text-white" />
          <h1 className="text-2xl font-bold tracking-tight">Your Workspaces</h1>
        </div>
        
        <div className="flex items-center gap-4">
          
          {/* Join Workspace Dialog */}
          <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 disabled:pointer-events-none disabled:opacity-50 bg-zinc-800 text-zinc-100 hover:bg-zinc-700 shadow h-9 px-4 py-2">
              <FolderGit2 className="h-4 w-4" />
              Join Workspace
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-zinc-100">
              <DialogHeader>
                <DialogTitle>Join Workspace</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Enter the Workspace ID shared by your teammate.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="join-id" className="text-right text-zinc-300">
                    ID
                  </Label>
                  <Input
                    id="join-id"
                    value={joinWorkspaceId}
                    onChange={(e) => setJoinWorkspaceId(e.target.value)}
                    className="col-span-3 bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-700 font-mono text-xs"
                    placeholder="e.g. 384e2a25-..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleJoinWorkspace} className="bg-white text-zinc-950 hover:bg-zinc-200">
                  Join Environment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Shadcn Dialog for Creating Workspaces */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 disabled:pointer-events-none disabled:opacity-50 bg-white text-zinc-950 hover:bg-zinc-200 shadow h-9 px-4 py-2">
              <Plus className="h-4 w-4" />
              New Workspace
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-zinc-100">
              <DialogHeader>
                <DialogTitle>Create Workspace</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  A workspace contains your files, whiteboard, and real-time audio rooms.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right text-zinc-300">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    className="col-span-3 bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-700"
                    placeholder="e.g. Project Phoenix"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateWorkspace} className="bg-white text-zinc-950 hover:bg-zinc-200">
                  Create Environment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-900" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Grid of Workspaces */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workspaces.length === 0 ? (
          <div className="col-span-full py-20 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
            <h3 className="text-lg font-medium text-zinc-300 mb-2">No Workspaces Found</h3>
            <p className="text-zinc-500 mb-6">Create a new workspace or join an existing one to start collaborating.</p>
            <div className="flex justify-center gap-4">
              <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-white text-zinc-950 hover:bg-zinc-200">
                <Plus className="h-4 w-4 mr-2" />
                Create Workspace
              </Button>
              <Button onClick={() => setIsJoinDialogOpen(true)} className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700">
                <FolderGit2 className="h-4 w-4 mr-2" />
                Join Workspace
              </Button>
            </div>
          </div>
        ) : (
          workspaces.map((ws) => (
            <Card key={ws.id} className="bg-zinc-900/50 border-zinc-800 flex flex-col justify-between hover:border-zinc-600 transition-colors cursor-pointer group" onClick={() => router.push(`/workspaces/${ws.id}`)}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl text-zinc-100">{ws.name}</CardTitle>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase tracking-wider">
                    {ws.role}
                  </span>
                </div>
                <CardDescription className="text-zinc-500 text-xs mt-2 flex items-center gap-2">
                  ID: {ws.id.split('-')[0]}...
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(ws.id);
                      alert("Copied full Workspace ID to clipboard!");
                    }}
                    className="hover:text-white transition-colors cursor-pointer bg-zinc-800 p-1 rounded"
                    title="Copy full ID"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-between items-center text-zinc-500 group-hover:text-white transition-colors">
                <span className="text-xs">Enter Environment</span>
                <ArrowRight className="h-4 w-4" />
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
