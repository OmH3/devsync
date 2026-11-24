import { useEffect, useRef, useState } from 'react';
import { Headphones, Mic, MicOff, PhoneOff, Volume2 } from 'lucide-react';
import { useSocket } from '../hooks/useSocket.js';

export default function VoiceRoom({ workspaceId }) {
  const socket = useSocket();
  const [online, setOnline] = useState(false);
  const [status, setStatus] = useState('idle');
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [peers, setPeers] = useState([]);
  const [error, setError] = useState('');
  const deafenedRef = useRef(false);
  const media = useRef(null), connections = useRef(new Map()), players = useRef(new Map()), generation = useRef(0);
  const leave = () => {
    generation.current++;
    socket?.emit('voice:leave');
    media.current?.getTracks().forEach(track => track.stop()); media.current = null;
    connections.current.forEach(pc => pc.close()); connections.current.clear();
    players.current.forEach(audio => { audio.pause(); audio.srcObject = null; }); players.current.clear();
    setPeers([]); setStatus('idle'); setMuted(false); deafenedRef.current = false; setDeafened(false);
  };
  const makePeer = id => {
    if (connections.current.has(id)) return connections.current.get(id);
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.pendingCandidates = [];
    media.current?.getAudioTracks().forEach(track => pc.addTrack(track, media.current));
    pc.onicecandidate = ({ candidate }) => { if (candidate) socket.emit('voice:signal', { to: id, candidate }); };
    pc.ontrack = ({ streams }) => { const audio = new Audio(); audio.autoplay = true; audio.muted = deafenedRef.current; audio.srcObject = streams[0]; players.current.set(id, audio); audio.play().catch(() => setError('Click the speaker control to enable incoming audio.')); };
    pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed') setError('A peer could not connect. Your network may require a TURN relay.'); };
    connections.current.set(id, pc); return pc;
  };
  useEffect(() => {
    if (!socket) return;
    const connected = () => setOnline(true);
    const disconnected = () => { setOnline(false); leave(); };
    setOnline(socket.connected);
    socket.on('connect', connected);
    const joined = peer => setPeers(prev => [...prev.filter(p => p.id !== peer.id), peer]);
    const left = ({ id }) => { connections.current.get(id)?.close(); connections.current.delete(id); const audio = players.current.get(id); if (audio) audio.srcObject = null; players.current.delete(id); setPeers(prev => prev.filter(p => p.id !== id)); };
    const signal = async ({ from, description, candidate }) => {
      if (!media.current) return;
      try {
        const pc = makePeer(from);
        if (description) {
          await pc.setRemoteDescription(description);
          for (const ice of pc.pendingCandidates.splice(0)) await pc.addIceCandidate(ice);
          if (description.type === 'offer') { await pc.setLocalDescription(await pc.createAnswer()); socket.emit('voice:signal', { to: from, description: pc.localDescription }); }
        } else if (candidate) { if (pc.remoteDescription) await pc.addIceCandidate(candidate); else pc.pendingCandidates.push(candidate); }
      } catch { setError('Audio connection interrupted. Leave and rejoin to retry.'); }
    };
    socket.on('voice:joined', joined); socket.on('voice:left', left); socket.on('voice:signal', signal); socket.on('disconnect', disconnected);
    return () => { socket.off('voice:joined', joined); socket.off('voice:left', left); socket.off('voice:signal', signal); socket.off('disconnect', disconnected); socket.off('connect', connected); leave(); };
    // Room lifetime follows the shared connection and workspace; event callbacks use refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, workspaceId]);
  const join = async () => {
    const attempt = ++generation.current; setStatus('joining'); setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      if (attempt !== generation.current) { stream.getTracks().forEach(t => t.stop()); return; }
      media.current = stream;
      const reply = await socket.timeout(8000).emitWithAck('voice:join', { workspaceId });
      if (attempt !== generation.current) return;
      if (reply.error) throw new Error(reply.error);
      setPeers(reply.peers); setStatus('connected');
      for (const peer of reply.peers) { const pc = makePeer(peer.id); await pc.setLocalDescription(await pc.createOffer()); socket.emit('voice:signal', { to: peer.id, description: pc.localDescription }); }
    } catch (err) { leave(); setError(err.name === 'NotAllowedError' ? 'Microphone access was denied. Allow it in your browser to join.' : err.message || 'Could not join audio.'); }
  };
  return <section className="voice-room" aria-label="Audio room"><div className="voice-heading"><Headphones size={15}/><span>Team lounge</span><span className="voice-count">{status === 'connected' ? peers.length + 1 : 'Audio'}</span></div>
    <p>{status === 'connected' ? 'Voice connected - Stay while you work' : 'A place to talk things through.'}</p>
    {status === 'connected' && <><div className="voice-people"><span>You {muted ? '(muted)' : ''}</span>{peers.map(p => <span key={p.id}>{p.name}</span>)}</div><div className="voice-controls"><button aria-label={muted ? 'Unmute microphone' : 'Mute microphone'} aria-pressed={muted} onClick={() => { media.current?.getAudioTracks().forEach(t => { t.enabled = muted; }); setMuted(!muted); }}>{muted ? <MicOff size={16}/> : <Mic size={16}/>}</button><button aria-label="Deafen audio" aria-pressed={deafened} onClick={() => { players.current.forEach(a => { a.muted = !deafened; a.play().catch(() => {}); }); deafenedRef.current = !deafened; setDeafened(!deafened); }}><Volume2 size={16}/></button><button aria-label="Leave audio room" onClick={leave}><PhoneOff size={16}/></button></div></>}
    {status !== 'connected' && <button className="voice-join" disabled={!online || status === 'joining'} onClick={join}>{status === 'joining' ? 'Connecting...' : 'Join audio room'}</button>}
    {error && <p role="alert" className="voice-error">{error}</p>}
  </section>;
}
