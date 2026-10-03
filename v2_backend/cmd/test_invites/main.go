package main

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"time"

	"github.com/devsync/v2_backend/internal/api/controllers"
	"github.com/devsync/v2_backend/internal/api/middleware"
	"github.com/devsync/v2_backend/internal/auth"
	"github.com/devsync/v2_backend/internal/config"
	"github.com/devsync/v2_backend/internal/logger"
	"github.com/devsync/v2_backend/internal/repository"
)

func main() {
	// 1. Setup Environment
	logger.Setup()
	auth.LoadKeys()
	cfg := config.LoadConfig()
	ctx := context.Background()
	config.ConnectDB(ctx, cfg.DatabaseURL)
	defer config.DB.Close()

	// 2. Setup the Owner and create a Workspace
	ownerEmail := fmt.Sprintf("owner_%d@example.com", time.Now().Unix())
	ownerID, _ := repository.CreateUser(ctx, ownerEmail, "hash")
	ws, _ := repository.CreateWorkspace(ctx, "Collab Space", ownerID)
	ownerToken, _ := auth.GenerateAccessToken(ownerID, ownerEmail)

	// 3. Setup the Teammate being invited
	teammateEmail := fmt.Sprintf("teammate_%d@example.com", time.Now().Unix())
	repository.CreateUser(ctx, teammateEmail, "hash")

	// 4. Wrap Invite Route in Gateway
	inviteRoute := middleware.AuthGateway(controllers.InviteUser)

	// --- TEST: INVITE TEAMMATE ---
	fmt.Println("--- TESTING: INVITE TEAMMATE ---")
	jsonPayload := []byte(fmt.Sprintf(`{"workspace_id": "%s", "email": "%s", "role": "editor"}`, ws.ID, teammateEmail))
	
	req, _ := http.NewRequest("POST", "/workspaces/invite", bytes.NewBuffer(jsonPayload))
	req.Header.Set("Authorization", "Bearer "+ownerToken) // Passed by the OWNER
	
	rec := httptest.NewRecorder()
	inviteRoute.ServeHTTP(rec, req)
	
	fmt.Printf("HTTP Status: %d\n", rec.Code)
	fmt.Printf("JSON Response: %s\n", rec.Body.String())
}
