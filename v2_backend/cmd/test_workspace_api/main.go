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

	// 2. Setup a real User in the DB to test with
	testEmail := fmt.Sprintf("test_ws_%d@example.com", time.Now().Unix())
	userID, _ := repository.CreateUser(ctx, testEmail, "fakehash")
	
	// 3. Generate a real token for that user
	token, _ := auth.GenerateAccessToken(userID, testEmail)

	// 4. Wrap the endpoints in the Gateway Middleware
	createRoute := middleware.AuthGateway(controllers.CreateWorkspace)
	getRoute := middleware.AuthGateway(controllers.GetWorkspaces)

	// --- TEST 1: CREATE WORKSPACE ---
	fmt.Println("--- TESTING: CREATE WORKSPACE ---")
	jsonPayload := []byte(`{"name": "My New Startup"}`)
	reqCreate, _ := http.NewRequest("POST", "/workspaces", bytes.NewBuffer(jsonPayload))
	reqCreate.Header.Set("Authorization", "Bearer "+token) // Pass through Gateway
	
	recCreate := httptest.NewRecorder()
	createRoute.ServeHTTP(recCreate, reqCreate)
	fmt.Printf("HTTP Status: %d\n", recCreate.Code)
	fmt.Printf("JSON Response: %s\n", recCreate.Body.String())

	// --- TEST 2: GET WORKSPACES ---
	fmt.Println("\n--- TESTING: GET WORKSPACES ---")
	reqGet, _ := http.NewRequest("GET", "/workspaces", nil)
	reqGet.Header.Set("Authorization", "Bearer "+token) // Pass through Gateway
	
	recGet := httptest.NewRecorder()
	getRoute.ServeHTTP(recGet, reqGet)
	fmt.Printf("HTTP Status: %d\n", recGet.Code)
	fmt.Printf("JSON Response: %s\n", recGet.Body.String())
}
