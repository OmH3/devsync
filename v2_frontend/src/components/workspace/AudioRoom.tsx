"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Phone, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioRoomProps {
  workspaceId: string;
  token: string;
  userId: string;
}

interface PeerAudio {
  id: string;
  stream: MediaStream;
  isSpeaking: boolean;
}

export default function AudioRoom({ workspaceId, token, userId }: AudioRoomProps) {
  const [inRoom, setInRoom] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [peers, setPeers] = useState<PeerAudio[]>([]);
  const [error, setError] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  const joinRoom = async () => {
    try {
      // 1. Get Local Microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      // 2. Setup WebRTC PeerConnection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      // Add local track to PC
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Handle incoming remote tracks from the Go SFU
      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        const trackId = event.track.id;
        
        setPeers((prev) => {
          if (prev.find((p) => p.id === trackId)) return prev;
          return [...prev, { id: trackId, stream: remoteStream, isSpeaking: false }];
        });
      };

      // 3. Connect to Go WebSocket Signaling Server directly bypassing Vercel
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const wsProtocol = apiUrl.startsWith("https") ? "wss:" : "ws:";
      const wsHost = apiUrl.replace(/^https?:\/\//, "");
      
      const wsUrl = `${wsProtocol}//${wsHost}/webrtc/join?workspace_id=${workspaceId}&token=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        // Create initial offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify({ event: "offer", data: offer }));
      };

      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        if (msg.event === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
        } else if (msg.event === "offer") {
          // The Go Server sends a new offer when a new track is added
          await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ event: "answer", data: answer }));
        } else if (msg.event === "ice-candidate") {
          await pc.addIceCandidate(new RTCIceCandidate(msg.data));
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          ws.send(JSON.stringify({ event: "ice-candidate", data: event.candidate }));
        }
      };

      setInRoom(true);
      setError("");
    } catch (err: any) {
      setError("Failed to access microphone or join room.");
      console.error(err);
    }
  };

  const leaveRoom = () => {
    if (wsRef.current) wsRef.current.close();
    if (pcRef.current) pcRef.current.close();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    
    wsRef.current = null;
    pcRef.current = null;
    localStreamRef.current = null;
    
    setPeers([]);
    setInRoom(false);
  };

  useEffect(() => {
    return () => leaveRoom();
  }, []);

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!localStreamRef.current.getAudioTracks()[0].enabled);
    }
  };

  // Bind audio streams to HTMLAudioElements so they actually play sound
  useEffect(() => {
    peers.forEach((peer) => {
      if (audioRefs.current[peer.id]) {
        audioRefs.current[peer.id].srcObject = peer.stream;
      }
    });
  }, [peers]);

  return (
    <div className="flex items-center gap-2">
      {/* Hidden audio tags to play incoming tracks */}
      {peers.map((peer) => (
        <audio 
          key={peer.id} 
          ref={(el) => { if (el) audioRefs.current[peer.id] = el; }} 
          autoPlay 
        />
      ))}

      {error && <span className="text-red-400 text-xs px-2">{error}</span>}

      {!inRoom ? (
        <Button id="header-audio-btn" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={joinRoom}>
          <Phone className="h-4 w-4" /> Join Audio Room
        </Button>
      ) : (
        <div className="flex items-center gap-2 bg-zinc-800 rounded-full pr-1 pl-3 py-1 border border-emerald-500/30">
          <div className="flex items-center gap-2 mr-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-semibold text-emerald-400">Live ({peers.length} peers)</span>
          </div>

          <Button 
            size="icon" 
            variant="ghost" 
            className={`h-7 w-7 rounded-full ${isMuted ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300' : 'bg-zinc-700 text-white hover:bg-zinc-600'}`}
            onClick={toggleMute}
          >
            {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
          </Button>

          <Button 
            size="icon" 
            variant="destructive" 
            className="h-7 w-7 rounded-full ml-1"
            onClick={leaveRoom}
          >
            <Phone className="h-3 w-3 rotate-[135deg]" />
          </Button>
        </div>
      )}
    </div>
  );
}
