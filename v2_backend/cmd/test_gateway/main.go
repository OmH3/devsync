package main

import (
	"fmt"
	"net/http"
	"net/http/httptest"

	"github.com/devsync/v2_backend/internal/api/middleware"
	"github.com/devsync/v2_backend/internal/api/utils"
	"github.com/devsync/v2_backend/internal/auth"
	"github.com/devsync/v2_backend/internal/logger"
)

// A fake protected controller (e.g. creating a workspace)
func FakeProtectedWorkspaceController(w http.ResponseWriter, r *http.Request) {
	// 1. Grab the user ID that the Gateway injected into the context!
	userID := r.Context().Value(middleware.UserIDKey).(string)
	
	// 2. Return a success message proving we know who called it
	utils.WriteJSON(w, http.StatusOK, map[string]string{
		"message": fmt.Sprintf("Welcome to the secret area, User %s!", userID),
	})
}

func main() {
	logger.Setup()
	auth.LoadKeys() // Need keys to generate/verify token

	// Wrap our fake controller inside the Massive Gateway
	protectedRoute := middleware.AuthGateway(FakeProtectedWorkspaceController)

	// --- SCENARIO 1: Hacker tries to access without a token ---
	fmt.Println("--- SCENARIO 1: NO TOKEN ---")
	reqNoToken, _ := http.NewRequest("GET", "/workspaces", nil)
	recorder := httptest.NewRecorder()
	protectedRoute.ServeHTTP(recorder, reqNoToken)
	fmt.Printf("HTTP Status: %d\n", recorder.Code)
	fmt.Printf("JSON Response: %s\n", recorder.Body.String())

	// --- SCENARIO 2: Valid User with Token ---
	fmt.Println("\n--- SCENARIO 2: VALID JWT TOKEN ---")
	validToken, _ := auth.GenerateAccessToken("123e4567-e89b-12d3-a456-426614174000", "legit@user.com")
	
	reqValid, _ := http.NewRequest("GET", "/workspaces", nil)
	reqValid.Header.Set("Authorization", "Bearer "+validToken)
	recorderValid := httptest.NewRecorder()
	
	protectedRoute.ServeHTTP(recorderValid, reqValid)
	fmt.Printf("HTTP Status: %d\n", recorderValid.Code)
	fmt.Printf("JSON Response: %s\n", recorderValid.Body.String())
}
