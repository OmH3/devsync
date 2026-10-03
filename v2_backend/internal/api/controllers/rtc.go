package controllers

import (
	"log/slog"
	"net/http"
	"strings"

	"github.com/devsync/v2_backend/internal/api/middleware"
	"github.com/devsync/v2_backend/internal/api/utils"
	"github.com/devsync/v2_backend/internal/repository"
	webrtcManager "github.com/devsync/v2_backend/internal/webrtc"
	"github.com/gorilla/websocket"
)

var rtcUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// JoinAudioRoom handles GET /webrtc/signal?workspace_id=...&token=...
// This upgrades to a WebSocket to handle WebRTC SDP signaling (Offer/Answer/ICE)
func JoinAudioRoom(w http.ResponseWriter, r *http.Request) {
	// 1. Authenticate Identity
	userID := r.Context().Value(middleware.UserIDKey).(string)

	workspaceID := r.URL.Query().Get("workspace_id")
	if strings.TrimSpace(workspaceID) == "" {
		utils.WriteError(w, utils.NewBadRequest("workspace_id is required"))
		return
	}

	// 2. RBAC Security Check
	_, err := repository.GetUserRole(r.Context(), workspaceID, userID)
	if err != nil {
		utils.WriteError(w, utils.NewForbidden("You do not have access to this workspace's audio room"))
		return
	}

	// 3. Upgrade to WebSocket
	conn, err := rtcUpgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("Failed to upgrade WebRTC signal websocket", "error", err)
		return
	}

	slog.Info("WebRTC Signaling WS Connected", "user_id", userID, "workspace", workspaceID)

	// 4. Delegate entirely to the Room Manager
	room := webrtcManager.GlobalRoomManager.GetOrCreateRoom(workspaceID)
	room.HandleNewConnection(userID, conn)
}
