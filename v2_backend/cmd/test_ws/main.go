package main

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"time"

	"github.com/devsync/v2_backend/internal/api/controllers"
	"github.com/devsync/v2_backend/internal/api/middleware"
	"github.com/devsync/v2_backend/internal/auth"
	"github.com/devsync/v2_backend/internal/config"
	"github.com/devsync/v2_backend/internal/logger"
	"github.com/devsync/v2_backend/internal/repository"
	"github.com/gorilla/websocket"
)

func main() {
	// 1. Setup
	logger.Setup()
	auth.LoadKeys()
	ctx := context.Background()
	config.ConnectDB(ctx, config.LoadConfig().DatabaseURL)
	defer config.DB.Close()

	// 2. Setup Test Data (2 Users, 1 Workspace)
	ownerID, _ := repository.CreateUser(ctx, fmt.Sprintf("wsowner_%d@example.com", time.Now().Unix()), "hash")
	friendID, _ := repository.CreateUser(ctx, fmt.Sprintf("wsfriend_%d@example.com", time.Now().Unix()), "hash")
	ws, _ := repository.CreateWorkspace(ctx, "Collab Room", ownerID)
	repository.AddUserToWorkspace(ctx, ws.ID, friendID, "editor")

	// Generate Tokens
	tokenOwner, _ := auth.GenerateAccessToken(ownerID, "owner")
	tokenFriend, _ := auth.GenerateAccessToken(friendID, "friend")

	// 3. Start a Mock HTTP Server running our Gateway + WebSocket Controller
	router := middleware.AuthGateway(controllers.ConnectYjsWebsocket)
	server := httptest.NewServer(router)
	defer server.Close()

	// Convert http:// to ws://
	wsURL := strings.Replace(server.URL, "http", "ws", 1) + "?workspace_id=" + ws.ID

	// 4. Connect Client A (Owner)
	dialer := websocket.Dialer{}
	headersA := http.Header{"Authorization": []string{"Bearer " + tokenOwner}}
	connA, _, err := dialer.Dial(wsURL, headersA)
	if err != nil {
		fmt.Println("Client A Failed to connect:", err)
		return
	}
	defer connA.Close()
	fmt.Println("Client A (Owner) Connected!")

	// 5. Connect Client B (Friend)
	headersB := http.Header{"Authorization": []string{"Bearer " + tokenFriend}}
	connB, _, err := dialer.Dial(wsURL, headersB)
	if err != nil {
		fmt.Println("Client B Failed to connect:", err)
		return
	}
	defer connB.Close()
	fmt.Println("Client B (Friend) Connected!")

	// 6. Test the Sync Relay! Client A sends a binary message.
	testMessage := []byte{0x01, 0x02, 0x03, 0x04} // Fake Yjs Binary Blob
	fmt.Printf("Client A is broadcasting Yjs Binary Blob: %v\n", testMessage)
	connA.WriteMessage(websocket.BinaryMessage, testMessage)

	// 7. Client B should receive it instantly
	connB.SetReadDeadline(time.Now().Add(2 * time.Second))
	msgType, receivedMsg, err := connB.ReadMessage()
	if err != nil {
		fmt.Println("Client B did not receive message:", err)
		return
	}
	
	if msgType == websocket.BinaryMessage {
		fmt.Printf("Client B successfully received Yjs Binary Blob: %v\n", receivedMsg)
	}
}
