"use client";

import { forwardRef, useImperativeHandle, useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import Placeholder from '@tiptap/extension-placeholder';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

import { 
  Bold, Italic, Strikethrough, Heading1, Heading2, 
  List, ListOrdered, Quote, Code, Undo, Redo 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface DocumentEditorRef {
  getHTML: () => string;
}

interface DocumentEditorProps {
  userRole?: string;
  ydoc: Y.Doc | null;
  provider: WebsocketProvider | null;
  activeFile: string;
  initialContent: string;
  userId: string;
}

const colors = ['#f783ac', '#8ce99a', '#74c0fc', '#ffa94d', '#c0eb75', '#a5d8ff', '#e599f7', '#ff8787'];
const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)];

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-zinc-900 border-b border-zinc-800">
      <Button size="sm" variant="ghost" className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" className={`h-8 w-8 p-0 ${editor.isActive('strike') ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-4 bg-zinc-800 mx-1"></div>
      
      <Button size="sm" variant="ghost" className={`h-8 w-8 p-0 ${editor.isActive('heading', { level: 1 }) ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" className={`h-8 w-8 p-0 ${editor.isActive('heading', { level: 2 }) ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-4 bg-zinc-800 mx-1"></div>
      
      <Button size="sm" variant="ghost" className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-4 bg-zinc-800 mx-1"></div>
      
      <Button size="sm" variant="ghost" className={`h-8 w-8 p-0 ${editor.isActive('blockquote') ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" className={`h-8 w-8 p-0 ${editor.isActive('codeBlock') ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        <Code className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-4 bg-zinc-800 mx-1"></div>
      
      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-zinc-400 hover:text-white" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
        <Undo className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-zinc-400 hover:text-white" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  );
};

const ActualEditor = forwardRef<DocumentEditorRef, DocumentEditorProps>(({ ydoc, provider, activeFile, initialContent, userId, userRole }, ref) => {
  const [synced, setSynced] = useState(false);
  const color = useRef(getRandomColor()).current;

  const editor = useEditor({
    editable: userRole !== "viewer",
    extensions: [
      StarterKit.configure({
        undoRedo: false, // The collaboration extension comes with its own undo/redo handling
      }),
      Collaboration.configure({
        document: ydoc!,
        field: `doc-${activeFile}`, // Scope it with "doc-" to avoid collisions with code editor files!
      }),
      CollaborationCaret.configure({
        provider: provider,
        user: { name: userId.slice(0, 8), color }
      }),
      Placeholder.configure({
        placeholder: 'Start writing your collaborative document...',
        emptyEditorClass: 'is-editor-empty cursor-text before:content-[attr(data-placeholder)] before:text-zinc-600 before:absolute before:pointer-events-none',
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-xl focus:outline-none max-w-none min-h-[calc(100vh-140px)] px-12 py-8 bg-[#18181b] shadow-xl',
      },
    },
  });

  useImperativeHandle(ref, () => ({
    getHTML: () => {
      if (!editor) return "";
      return editor.getHTML();
    }
  }));

  useEffect(() => {
    if (!editor || !ydoc || !activeFile) return;

    // Check if the document fragment is completely empty. If so, seed it.
    const yXmlFragment = ydoc.getXmlFragment(`doc-${activeFile}`);
    
    // Y.XmlFragment doesn't have an easy length property, but we can check if it's empty
    if (yXmlFragment.length === 0 && initialContent && initialContent.trim() !== "") {
      // Use setTimeout to ensure Tiptap has fully bound to the fragment
      setTimeout(() => {
        // Only set content if it's STILL empty (prevents race condition with other users)
        if (yXmlFragment.length === 0) {
          editor.commands.setContent(initialContent);
        }
      }, 100);
    }
  }, [editor, ydoc, activeFile, initialContent]);

  useEffect(() => {
    if (!provider) return;
    setSynced(provider.wsconnected);
    const handler = (event: { status: string }) => setSynced(event.status === "connected");
    provider.on("status", handler);
    return () => provider.off("status", handler);
  }, [provider]);

  return (
    <div className="w-full h-full flex flex-col relative bg-[#121212] overflow-hidden">
      {synced ? (
        <div className="absolute top-16 right-8 z-10 px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30 flex items-center gap-2 shadow-xl backdrop-blur-sm pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          Synced
        </div>
      ) : (
        <div className="absolute top-16 right-8 z-10 px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-full border border-red-500/30 flex items-center gap-2 shadow-xl backdrop-blur-sm pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          Connecting...
        </div>
      )}
      
      <MenuBar editor={editor} />
      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
        <div className="w-full max-w-4xl">
          <EditorContent editor={editor} className="w-full" />
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .collaboration-carets__caret {
          border-left: 2px solid #0d0d0d;
          border-right: 2px solid #0d0d0d;
          margin-left: -2px;
          margin-right: -2px;
          pointer-events: none;
          position: relative;
          word-break: normal;
        }
        .collaboration-carets__label {
          border-radius: 3px 3px 3px 0;
          color: #0d0d0d;
          font-size: 12px;
          font-weight: 600;
          left: -1px;
          line-height: normal;
          padding: 0.1rem 0.3rem;
          position: absolute;
          top: -1.4em;
          user-select: none;
          white-space: nowrap;
        }
      `}} />
    </div>
  );
});

const DocumentEditor = forwardRef<DocumentEditorRef, DocumentEditorProps>((props, ref) => {
  if (!props.activeFile) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-[#1e1e1e] text-zinc-500">
        <p className="text-sm font-semibold">No document selected</p>
        <p className="text-xs mt-1 text-zinc-600">Select or create a document to start writing</p>
      </div>
    );
  }

  if (!props.ydoc || !props.provider) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-[#1e1e1e] text-zinc-500">
        <p className="text-sm font-semibold">Connecting to collaboration server...</p>
      </div>
    );
  }

  return <ActualEditor {...props} ref={ref} />;
});

DocumentEditor.displayName = "DocumentEditor";
export default DocumentEditor;
