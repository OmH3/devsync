package main

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"time"

	"github.com/devsync/v2_backend/internal/api/controllers"
	"github.com/devsync/v2_backend/internal/auth"
	"github.com/devsync/v2_backend/internal/config"
	"github.com/devsync/v2_backend/internal/logger"
)

func main() {
	// 1. Setup Environment
	logger.Setup()
	auth.LoadKeys()
	
	cfg := config.LoadConfig()
	ctx := context.Background()
	config.ConnectDB(ctx, cfg.DatabaseURL)
	defer config.DB.Close()

	// Generate a unique email every time so the test doesn't fail on "duplicate email"
	uniqueEmail := fmt.Sprintf("user_%d@example.com", time.Now().Unix())
	jsonPayload := []byte(fmt.Sprintf(`{"email": "%s", "password": "supersecretpassword"}`, uniqueEmail))

	// 2. SIMULATE SIGNUP
	fmt.Println("--- TESTING SIGNUP ---")
	req, _ := http.NewRequest("POST", "/signup", bytes.NewBuffer(jsonPayload))
	req.Header.Set("Content-Type", "application/json")
	
	recorder := httptest.NewRecorder()
	controllers.Signup(recorder, req)
	
	fmt.Printf("HTTP Status: %d\n", recorder.Code)
	fmt.Printf("JSON Response: %s\n", recorder.Body.String())

	// 3. SIMULATE LOGIN (Using the same credentials we just signed up with)
	fmt.Println("\n--- TESTING LOGIN ---")
	req2, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(jsonPayload))
	req2.Header.Set("Content-Type", "application/json")
	
	recorder8 := httptest.NewRecorder()
	controllers.Login(recorder8, req2)
	
	fmt.Printf("HTTP Status: %d\n", recorder8.Code)
	fmt.Printf("JSON Response: %s\n", recorder8.Body.String())
}
