package main

import (
	"log/slog"

	"github.com/devsync/v2_backend/internal/auth"
	"github.com/devsync/v2_backend/internal/logger"
)

func main() {
	// 1. Init structured logging
	logger.Setup()

	// 2. Load the RSA keys we generated earlier
	err := auth.LoadKeys()
	if err != nil {
		slog.Error("Failed to load keys", "error", err)
		return
	}
	slog.Info("Successfully loaded RSA Private and Public keys")

	// 3. Generate an Access Token using the PRIVATE KEY
	userID := "999e4567-e89b-12d3-a456-426614174000"
	email := "test@devsync.com"
	
	tokenStr, err := auth.GenerateAccessToken(userID, email)
	if err != nil {
		slog.Error("Failed to generate token", "error", err)
		return
	}
	slog.Info("Successfully Minted JWT Token", "token", tokenStr)

	// 4. Validate the Token using the PUBLIC KEY
	claims, err := auth.ValidateToken(tokenStr)
	if err != nil {
		slog.Error("Failed to validate token", "error", err)
		return
	}
	slog.Info("Successfully Verified Token (with Public Key)", 
		"user_id", claims.UserID, 
		"email", claims.Email,
	)
}
