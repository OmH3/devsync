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
	// 1. Setup Environment
	logger.Setup()
	auth.LoadKeys()
	ctx := context.Background()
	config.ConnectDB(ctx, config.LoadConfig().DatabaseURL)
	defer config.DB.Close()

	// 2. Setup Test Data (User + Workspace)
	ownerID, _ := repository.CreateUser(ctx, fmt.Sprintf("fileowner_%d@example.com", time.Now().Unix()), "hash")
	ws, _ := repository.CreateWorkspace(ctx, "File Tree Workspace", ownerID)
	token, _ := auth.GenerateAccessToken(ownerID, "fileowner")

	// 3. Wrap Routes in Gateway
	createRoute := middleware.AuthGateway(controllers.CreateFile)
	listRoute := middleware.AuthGateway(controllers.ListFiles)

	// --- TEST 1: CREATE FILE ---
	fmt.Println("--- TESTING: CREATE FILE ---")
	reqBody, _ := json.Marshal(map[string]string{
		"workspace_id": ws.ID,
		"name":         "main.go",
	})
	
	reqCreate, _ := http.NewRequest("POST", "/files", bytes.NewBuffer(reqBody))
	reqCreate.Header.Set("Authorization", "Bearer "+token)
	
	recCreate := httptest.NewRecorder()
	createRoute.ServeHTTP(recCreate, reqCreate)
	
	fmt.Printf("HTTP Status: %d\n", recCreate.Code)
	fmt.Printf("JSON Response: %s\n", recCreate.Body.String())

	// --- TEST 2: LIST FILES ---
	fmt.Println("\n--- TESTING: LIST FILES ---")
	reqList, _ := http.NewRequest("GET", "/files?workspace_id="+ws.ID, nil)
	reqList.Header.Set("Authorization", "Bearer "+token)
	
	recList := httptest.NewRecorder()
	listRoute.ServeHTTP(recList, reqList)
	
	fmt.Printf("HTTP Status: %d\n", recList.Code)
	fmt.Printf("JSON Response: %s\n", recList.Body.String())
}
