import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

export default function RichDocument({ value, onChange, readOnly }) {
  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: 'Start writing. Make room for your next idea...' })],
    content: value?.startsWith('<') ? value : { type: 'doc', content: [{ type: 'paragraph', content: value ? [{ type: 'text', text: value }] : [] }] },
    editable: !readOnly,
    editorProps: { attributes: { 'aria-label': 'Document content', class: 'document-prose' } },
    onUpdate: ({ editor }) => onChange({ target: { value: editor.getHTML() } }),
  });
  useEffect(() => { editor?.setEditable(!readOnly); }, [editor, readOnly]);
  useEffect(() => {
    if (editor && value !== editor.getHTML() && value !== editor.getText()) editor.commands.setContent(value || '', { emitUpdate: false });
  }, [editor, value]);
  if (!editor) return null;
  const actions = [
    ['Bold', 'B', () => editor.chain().focus().toggleBold().run(), 'bold'],
    ['Italic', 'I', () => editor.chain().focus().toggleItalic().run(), 'italic'],
    ['Heading', 'H1', () => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'heading'],
    ['Bullet list', 'List', () => editor.chain().focus().toggleBulletList().run(), 'bulletList'],
    ['Numbered list', '1. List', () => editor.chain().focus().toggleOrderedList().run(), 'orderedList'],
    ['Quote', 'Quote', () => editor.chain().focus().toggleBlockquote().run(), 'blockquote'],
    ['Code block', '</>', () => editor.chain().focus().toggleCodeBlock().run(), 'codeBlock'],
    ['Undo', 'Undo', () => editor.chain().focus().undo().run()],
    ['Redo', 'Redo', () => editor.chain().focus().redo().run()],
  ];
  return <div className="rich-document"><div className="editor-toolbar" aria-label="Text formatting">{actions.map(([label, text, action, type]) => <button key={label} type="button" title={label} aria-label={label} aria-pressed={type ? editor.isActive(type) : undefined} disabled={readOnly} onClick={action}>{text}</button>)}</div><EditorContent editor={editor} /></div>;
}
