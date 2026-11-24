import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker';
import TsWorker from 'monaco-editor/language/typescript/ts.worker.js?worker';
import JsonWorker from 'monaco-editor/language/json/json.worker.js?worker';
import CssWorker from 'monaco-editor/language/css/css.worker.js?worker';
import HtmlWorker from 'monaco-editor/language/html/html.worker.js?worker';
import { useThemeStore } from '../../store/themeStore.js';
self.MonacoEnvironment = { getWorker: (_, label) => {
  if (label === 'typescript' || label === 'javascript') return new TsWorker();
  if (label === 'json') return new JsonWorker();
  if (label === 'css') return new CssWorker();
  if (label === 'html') return new HtmlWorker();
  return new EditorWorker();
} };
loader.config({ monaco });
export default function SourceEditor({ value, language, readOnly, onChange, onSave }) {
  const theme = useThemeStore((s) => s.theme);
  return <Editor height="100%" theme={theme === 'dark' ? 'vs-dark' : 'vs'} language={language} value={value} onChange={value => onChange({ target: { value: value || '' } })}
    onMount={editor => {
      window.__devsyncMonacoEditor = editor;
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, onSave);
    }}
    options={{ readOnly, minimap: { enabled: false }, fontSize: 14, padding: { top: 20 }, scrollBeyondLastLine: false, automaticLayout: true, wordWrap: 'on', ariaLabel: 'Code content' }} />;
}
