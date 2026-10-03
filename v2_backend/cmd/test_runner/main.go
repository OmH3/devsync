package main

import (
	"bytes"
	"context"
	"encoding/json"
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
	// 1. Setup
	logger.Setup()
	auth.LoadKeys()
	ctx := context.Background()
	config.ConnectDB(ctx, config.LoadConfig().DatabaseURL)
	defer config.DB.Close()

	// 2. Setup Test Data
	userID, _ := repository.CreateUser(ctx, fmt.Sprintf("coder_%d@example.com", time.Now().Unix()), "hash")
	ws, _ := repository.CreateWorkspace(ctx, "Code Room", userID)
	token, _ := auth.GenerateAccessToken(userID, "coder")

	// 3. Wrap Route in Gateway
	runRoute := middleware.AuthGateway(controllers.RunCode)

	// --- TEST 1: SAFE CODE ---
	fmt.Println("--- TESTING: SAFE PYTHON CODE ---")
	reqBody1, _ := json.Marshal(map[string]string{
		"workspace_id": ws.ID,
		"language":     "python",
		"code":         "print('Hello from inside the secure Docker container!')\nfor i in range(3):\n  print(f'Count: {i}')",
	})
	
	req1, _ := http.NewRequest("POST", "/run", bytes.NewBuffer(reqBody1))
	req1.Header.Set("Authorization", "Bearer "+token)
	
	rec1 := httptest.NewRecorder()
	runRoute.ServeHTTP(rec1, req1)
	fmt.Printf("HTTP Status: %d\n", rec1.Code)
	fmt.Printf("JSON Response: %s\n", rec1.Body.String())

	// --- TEST 2: MALICIOUS INFINITE LOOP ---
	fmt.Println("\n--- TESTING: MALICIOUS INFINITE LOOP ---")
	reqBody2, _ := json.Marshal(map[string]string{
		"workspace_id": ws.ID,
		"language":     "python",
		"code":         "while True:\n  pass",
	})
	
	req2, _ := http.NewRequest("POST", "/run", bytes.NewBuffer(reqBody2))
	req2.Header.Set("Authorization", "Bearer "+token)
	
	rec2 := httptest.NewRecorder()
	
	// This will block for exactly 5 seconds before the Timeout Context kills Docker
	start := time.Now()
	runRoute.ServeHTTP(rec2, req2)
	duration := time.Since(start)

	fmt.Printf("HTTP Status: %d\n", rec2.Code)
	fmt.Printf("JSON Response: %s\n", rec2.Body.String())
	fmt.Printf("Execution time forcefully stopped at: %v\n", duration)
}
