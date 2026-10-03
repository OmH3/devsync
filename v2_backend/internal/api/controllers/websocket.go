package controllers

import (
	"log/slog"
	"net/http"
	"strings"

	"github.com/devsync/v2_backend/internal/api/middleware"
	"github.com/devsync/v2_backend/internal/api/utils"
	"github.com/devsync/v2_backend/internal/repository"
	"github.com/devsync/v2_backend/internal/ws"
	"github.com/gorilla/websocket"
)

// Upgrader defines how we convert a standard HTTP request into a persistent WebSocket
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// In production, we will restrict this to our Next.js frontend domain
		return true 
	},
}

// ConnectYjsWebsocket handles the WS upgrade for Collaborative Code & Docs
func ConnectYjsWebsocket(w http.ResponseWriter, r *http.Request) {
	// 1. Grab Identity from API Gateway Context
	userID := r.Context().Value(middleware.UserIDKey).(string)

	// 2. Extract Workspace ID from URL (e.g. /ws/workspaces/{id})
	// For simplicity in native http, we will grab it from a query param: ?workspace_id=abc
	workspaceID := r.URL.Query().Get("workspace_id")
	if strings.TrimSpace(workspaceID) == "" {
		utils.WriteError(w, utils.NewBadRequest("workspace_id is required"))
		return
	}

	// 3. RBAC SECURITY CHECK!
	// Is this user actually in this workspace? 
	_, err := repository.GetUserRole(r.Context(), workspaceID, userID)
	if err != nil {
		utils.WriteError(w, utils.NewForbidden("You do not have access to this workspace"))
		return
	}

	// 4. Upgrade the HTTP connection to a WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("Failed to upgrade websocket", "error", err)
		return
	}

	slog.Info("WebSocket Upgraded successfully", "user_id", userID, "workspace", workspaceID)

	// 5. Create a new Client and register it with the Global Hub
	client := &ws.Client{
		Hub:         ws.GlobalHub,
		WorkspaceID: workspaceID,
		UserID:      userID,
		Conn:        conn,
		Send:        make(chan []byte, 256),
	}
	client.Hub.AddClient(workspaceID, client)

	// 6. Start the infinite I/O loops (Goroutines)
	// These run concurrently in the background for as long as the user is connected
	go client.WritePump()
	go client.ReadPump()
}
