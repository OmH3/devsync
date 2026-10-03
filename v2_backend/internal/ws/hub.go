package ws

import (
	"sync"
)

// Hub manages active WebSocket clients grouped by Workspace ID.
type Hub struct {
	sync.RWMutex
	// Rooms maps a WorkspaceID to a set of active Client connections
	Rooms map[string]map[*Client]bool
}

// GlobalHub is the singleton instance handling all live documents/whiteboards
var GlobalHub = &Hub{
	Rooms: make(map[string]map[*Client]bool),
}

// AddClient safely registers a new user to a workspace room
func (h *Hub) AddClient(workspaceID string, c *Client) {
	h.Lock()
	defer h.Unlock()

	if h.Rooms[workspaceID] == nil {
		h.Rooms[workspaceID] = make(map[*Client]bool)
	}
	h.Rooms[workspaceID][c] = true
}

// RemoveClient safely unregisters a user when they disconnect
func (h *Hub) RemoveClient(workspaceID string, c *Client) {
	h.Lock()
	defer h.Unlock()

	if room, ok := h.Rooms[workspaceID]; ok {
		delete(room, c)
		// Clean up empty rooms to save memory
		if len(room) == 0 {
			delete(h.Rooms, workspaceID)
		}
	}
}

// Broadcast sends a binary Yjs update to everyone in the workspace EXCEPT the sender
func (h *Hub) Broadcast(workspaceID string, sender *Client, message []byte) {
	h.RLock()
	defer h.RUnlock()

	if room, ok := h.Rooms[workspaceID]; ok {
		for client := range room {
			if client != sender {
				// Non-blocking send to prevent one slow client from freezing the whole room
				select {
				case client.Send <- message:
				default:
					// If the client's buffer is full, assume they dropped and ignore
				}
			}
		}
	}
}
