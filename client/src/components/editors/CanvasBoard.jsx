import { useEffect, useRef, useState } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { whiteboardService } from '../../services/whiteboard.service.js';
import { useSocket } from '../../hooks/useSocket.js';
import WhiteboardCanvas from '../WhiteboardCanvas.jsx';

export default function CanvasBoard({ whiteboard }) {
  const socket = useSocket();
  const [api, setApi] = useState(null), [canEdit, setCanEdit] = useState(false), [status, setStatus] = useState('Loading...');
  const timer = useRef(null), latest = useRef(null), fingerprint = useRef(''), remote = useRef(false);
  const scene = whiteboard.boardElements?.find(item => item.type === 'scene');
  const legacy = whiteboard.boardElements?.length > 0 && !scene;
  useEffect(() => { let active = true; whiteboardService.getUserRoleInWhiteboard(whiteboard._id).then(data => { if (active) { setCanEdit(data.permissions.canEdit); setStatus('Saved'); } }).catch(() => { if (active) setStatus('Unable to load permissions'); }); return () => { active = false; }; }, [whiteboard._id]);
  useEffect(() => {
    if (!socket || !api) return;
    const join = () => socket.emit('join-whiteboard', whiteboard._id);
    const receive = data => { if (data.whiteboardId !== whiteboard._id) return; remote.current = true; fingerprint.current = JSON.stringify(data.scene.elements); api.updateScene({ elements: data.scene.elements }); if (data.scene.files) api.addFiles(Object.values(data.scene.files)); remote.current = false; };
    join(); socket.on('connect', join); socket.on('whiteboard:scene', receive);
    return () => { socket.off('connect', join); socket.off('whiteboard:scene', receive); socket.emit('leave-whiteboard', whiteboard._id); };
  }, [socket, api, whiteboard._id]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const save = async () => {
    if (!latest.current || !canEdit) return;
    setStatus('Saving...');
    try { await whiteboardService.updateWhiteboard(whiteboard._id, { boardElements: [latest.current] }); setStatus('Saved'); }
    catch { setStatus('Save failed - retry'); }
  };
  if (legacy) return <WhiteboardCanvas whiteboard={whiteboard} />;
  return <div className="relative h-full min-h-[500px]"><div className="absolute right-4 top-3 z-10"><button className="rounded border bg-white px-3 py-1 text-xs" onClick={save} disabled={!canEdit}>{status}</button></div><Excalidraw theme="light" excalidrawAPI={setApi} viewModeEnabled={!canEdit}
    initialData={{ elements: scene?.elements || [], files: scene?.files || {}, appState: { viewBackgroundColor: '#ffffff' } }}
    UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false } }}
    onChange={(elements, _, files) => {
      const signature = JSON.stringify(elements);
      if (!canEdit || remote.current || signature === fingerprint.current) return;
      fingerprint.current = signature;
      latest.current = { type: 'scene', elements, files };
      setStatus('Unsaved'); clearTimeout(timer.current); timer.current = setTimeout(save, 1200);
      socket?.emit('whiteboard:scene', { whiteboardId: whiteboard._id, scene: latest.current });
    }} /></div>;
}
