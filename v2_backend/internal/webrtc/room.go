package webrtc

import (
	"encoding/json"
	"log/slog"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/pion/webrtc/v3"
)

type SignalMessage struct {
	Event string          `json:"event"`
	Data  json.RawMessage `json:"data"`
}

type Peer struct {
	ID   string
	Conn *websocket.Conn
	PC   *webrtc.PeerConnection
	mu   sync.Mutex
}

func (p *Peer) SendSignal(event string, data interface{}) {
	b, _ := json.Marshal(data)
	msg := SignalMessage{Event: event, Data: b}
	p.mu.Lock()
	defer p.mu.Unlock()
	p.Conn.WriteJSON(msg)
}

type Room struct {
	ID     string
	mu     sync.RWMutex
	Peers  map[string]*Peer
	Tracks map[string]*webrtc.TrackLocalStaticRTP
}

type RoomManager struct {
	mu    sync.RWMutex
	Rooms map[string]*Room
}

var GlobalRoomManager = &RoomManager{
	Rooms: make(map[string]*Room),
}

func (rm *RoomManager) GetOrCreateRoom(workspaceID string) *Room {
	rm.mu.Lock()
	defer rm.mu.Unlock()
	room, exists := rm.Rooms[workspaceID]
	if !exists {
		room = &Room{
			ID:     workspaceID,
			Peers:  make(map[string]*Peer),
			Tracks: make(map[string]*webrtc.TrackLocalStaticRTP),
		}
		rm.Rooms[workspaceID] = room
	}
	return room
}

func (r *Room) HandleNewConnection(userID string, ws *websocket.Conn) {
	pc, err := webrtc.NewPeerConnection(webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{{URLs: []string{"stun:stun.l.google.com:19302"}}},
	})
	if err != nil {
		slog.Error("Failed to create PeerConnection", "err", err)
		ws.Close()
		return
	}

	peer := &Peer{ID: userID, Conn: ws, PC: pc}

	r.mu.Lock()
	r.Peers[userID] = peer
	
	// Add all existing tracks to this new peer
	for _, track := range r.Tracks {
		if _, err := pc.AddTrack(track); err != nil {
			slog.Error("Failed to add existing track to new peer", "err", err)
		}
	}
	r.mu.Unlock()

	// When this peer sends a track to the SFU
	pc.OnTrack(func(remoteTrack *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
		slog.Info("Received new audio track", "user_id", userID)

		localTrack, err := webrtc.NewTrackLocalStaticRTP(remoteTrack.Codec().RTPCodecCapability, remoteTrack.ID(), remoteTrack.StreamID())
		if err != nil {
			return
		}

		r.mu.Lock()
		r.Tracks[localTrack.ID()] = localTrack
		
		// Forward this new track to all OTHER peers
		for id, otherPeer := range r.Peers {
			if id == userID {
				continue
			}
			if _, err = otherPeer.PC.AddTrack(localTrack); err != nil {
				continue
			}
			
			// Renegotiate with the other peer
			go func(p *Peer) {
				offer, err := p.PC.CreateOffer(nil)
				if err != nil {
					return
				}
				if err := p.PC.SetLocalDescription(offer); err != nil {
					return
				}
				p.SendSignal("offer", offer)
			}(otherPeer)
		}
		r.mu.Unlock()

		rtpBuf := make([]byte, 1400)
		for {
			i, _, readErr := remoteTrack.Read(rtpBuf)
			if readErr != nil {
				return
			}
			if _, writeErr := localTrack.Write(rtpBuf[:i]); writeErr != nil {
				return
			}
		}
	})

	pc.OnICECandidate(func(candidate *webrtc.ICECandidate) {
		if candidate != nil {
			peer.SendSignal("ice-candidate", candidate.ToJSON())
		}
	})

	for {
		var msg SignalMessage
		err := ws.ReadJSON(&msg)
		if err != nil {
			break
		}

		switch msg.Event {
		case "offer":
			var offer webrtc.SessionDescription
			json.Unmarshal(msg.Data, &offer)
			pc.SetRemoteDescription(offer)
			answer, _ := pc.CreateAnswer(nil)
			pc.SetLocalDescription(answer)
			peer.SendSignal("answer", answer)
		case "answer":
			var answer webrtc.SessionDescription
			json.Unmarshal(msg.Data, &answer)
			pc.SetRemoteDescription(answer)
		case "ice-candidate":
			var candidate webrtc.ICECandidateInit
			json.Unmarshal(msg.Data, &candidate)
			pc.AddICECandidate(candidate)
		}
	}

	r.mu.Lock()
	delete(r.Peers, userID)
	r.mu.Unlock()
	pc.Close()
	ws.Close()
}
