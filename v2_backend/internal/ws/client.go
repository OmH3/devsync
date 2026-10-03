package ws

import (
	"log/slog"
	"github.com/gorilla/websocket"
)

// Client wraps the physical WebSocket connection for a single user
type Client struct {
	Hub         *Hub
	WorkspaceID string
	UserID      string
	Conn        *websocket.Conn
	Send        chan []byte // Buffered channel of outbound messages
}

// ReadPump continuously listens for new binary updates from the frontend (Yjs)
func (c *Client) ReadPump() {
	// If the loop breaks (e.g. user closes laptop), cleanly unregister them
	defer func() {
		c.Hub.RemoveClient(c.WorkspaceID, c)
		c.Conn.Close()
		slog.Info("WebSocket client disconnected", "user_id", c.UserID, "workspace", c.WorkspaceID)
	}()

	for {
		// Yjs strictly uses Binary messages to sync document state highly efficiently
		messageType, message, err := c.Conn.ReadMessage()
		if err != nil {
			break // Connection dropped or errored
		}

		if messageType == websocket.BinaryMessage {
			// We act as a blind relay: just forward the Uint8Array to the other clients
			c.Hub.Broadcast(c.WorkspaceID, c, message)
		}
	}
}

// WritePump pushes queued messages from the Hub back out to the frontend
func (c *Client) WritePump() {
	defer c.Conn.Close()

	for message := range c.Send {
		err := c.Conn.WriteMessage(websocket.BinaryMessage, message)
		if err != nil {
			break
		}
	}
}
