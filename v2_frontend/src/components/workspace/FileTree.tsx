"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { FileCode2, FileJson, FileText, Plus, X, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as Y from "yjs";

interface FileTreeProps {
  userRole?: string;
  workspaceId: string;
  token: string;
  activeFile: string;
  setActiveFile: (name: string) => void;
  files: DBFile[];
  setFiles: (files: DBFile[]) => void;
  extensionFilter?: string[];
  excludeExtensions?: string[];
  ydoc?: Y.Doc | null;
}

interface DBFile {
  id: string;
  workspace_id: string;
  name: string;
  content: string;
}

export default function FileTree({ workspaceId, token, activeFile, setActiveFile, files, setFiles, extensionFilter, excludeExtensions, ydoc }: FileTreeProps) {
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  const fetchFiles = async () => {
    try {
      const res = await axios.get(`/api/files?workspace_id=${workspaceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let fetchedFiles = (res.data?.data || []).filter((f: DBFile) => f.name !== 'whiteboard.json');
      
      if (extensionFilter && extensionFilter.length > 0) {
        fetchedFiles = fetchedFiles.filter((f: DBFile) => 
          extensionFilter.some(ext => f.name.endsWith(ext))
        );
      }

      if (excludeExtensions && excludeExtensions.length > 0) {
        fetchedFiles = fetchedFiles.filter((f: DBFile) => 
          !excludeExtensions.some(ext => f.name.endsWith(ext))
        );
      }

      setFiles(fetchedFiles);
      
      // If we don't have an active file and there are files, select the first one
      if (fetchedFiles.length > 0 && (!activeFile || !fetchedFiles.find((f: DBFile) => f.name === activeFile))) {
        setActiveFile(fetchedFiles[0].name);
      } else if (fetchedFiles.length === 0) {
        setActiveFile(""); // Clear active file if no files left
      }
    } catch (error) {
      console.error("Failed to fetch files", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
    
    if (!ydoc) return;
    
    const fileTreeSync = ydoc.getMap("file-tree-sync");
    const handleSync = () => {
      fetchFiles();
    };
    
    fileTreeSync.observe(handleSync);
    
    return () => {
      fileTreeSync.unobserve(handleSync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, token, ydoc]);

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    let finalName = newFileName.trim();
    
    // Auto-append appropriate extension if they forgot it in the Documents Hub
    if (extensionFilter && extensionFilter.length > 0) {
      const hasValidExt = extensionFilter.some(ext => finalName.endsWith(ext));
      if (!hasValidExt) {
        finalName += extensionFilter[0]; // e.g., appends ".doc"
      }
    }

    try {
      await axios.post("/api/files", 
        { workspace_id: workspaceId, name: finalName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setActiveFile(finalName);
      setNewFileName("");
      setIsCreating(false);
      fetchFiles();

      if (ydoc) {
        ydoc.getMap("file-tree-sync").set("last-update", Date.now());
      }
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to create file");
    }
  };

  const handleDeleteFile = async (e: React.MouseEvent, fileId: string, fileName: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete ${fileName}?`)) return;

    try {
      await axios.delete(`/api/files?workspace_id=${workspaceId}&file_id=${fileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (activeFile === fileName) {
        setActiveFile("");
      }
      fetchFiles();

      if (ydoc) {
        ydoc.getMap("file-tree-sync").set("last-update", Date.now());
        
        // Wipe the in-memory CRDT state for this file so it doesn't bleed into recreated files
        const oldCode = ydoc.getText(fileName);
        if (oldCode.length > 0) oldCode.delete(0, oldCode.length);
        
        const oldDoc = ydoc.getXmlFragment(`doc-${fileName}`);
        if (oldDoc.length > 0) oldDoc.delete(0, oldDoc.length);
        
        const oldBoard = ydoc.getMap(`whiteboard-sync-${fileName}`);
        if (oldBoard.keys().length > 0) oldBoard.clear();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to delete file");
    }
  };

  const getFileIcon = (filename: string) => {
    if (filename.endsWith('.py') || filename.endsWith('.js') || filename.endsWith('.ts')) return <FileCode2 className="h-4 w-4" />;
    if (filename.endsWith('.json')) return <FileJson className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-zinc-900/40">
      <div className="h-10 flex items-center justify-between px-4 border-b border-zinc-800 shrink-0">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Project Files</span>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-white" onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isCreating && (
          <form onSubmit={handleCreateFile} className="mb-2 flex items-center gap-1 bg-zinc-800 rounded px-2 py-1">
            <FileText className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <input 
              autoFocus
              type="text" 
              className="bg-transparent text-sm text-zinc-200 outline-none w-full border-none focus:ring-0 p-0"
              placeholder={extensionFilter ? (extensionFilter[0] === '.doc' ? 'e.g. document' : 'e.g. architecture') : 'e.g. main.py'}
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsCreating(false);
              }}
              onBlur={() => setIsCreating(false)}
            />
          </form>
        )}

        {files.length === 0 && !isCreating ? (
          <div className="text-xs text-zinc-500 italic text-center mt-4">
            No files in workspace.<br/>Click + to create one.
          </div>
        ) : (
          <div className="space-y-1">
            {files.map((file) => (
              <div 
                key={file.id}
                className={`p-2 text-sm rounded cursor-pointer flex items-center justify-between group ${
                  activeFile === file.name 
                    ? 'bg-blue-900/30 text-blue-400' 
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
                }`}
                onClick={() => setActiveFile(file.name)}
              >
                <div className="flex items-center gap-2 truncate flex-1">
                  {getFileIcon(file.name)}
                  <span className="truncate">{file.name}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 shrink-0" 
                  onClick={(e) => handleDeleteFile(e, file.id, file.name)}
                  title="Delete File"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
