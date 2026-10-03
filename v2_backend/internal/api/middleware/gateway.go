package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/devsync/v2_backend/internal/api/utils"
	"github.com/devsync/v2_backend/internal/auth"
)

// Define strict context keys to prevent collisions in the Go Request Context
type contextKey string
const (
	UserIDKey    contextKey = "user_id"
	UserEmailKey contextKey = "user_email"
)

// AuthGateway is the massive "bouncing gate". Every protected route passes through here.
func AuthGateway(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var tokenStr string

		// 1. Try the standard "Authorization: Bearer <token>" header first (REST APIs)
		authHeader := r.Header.Get("Authorization")
		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
		} else {
			// 2. Fallback: read from ?token= query param (required for WebSocket connections
			// because browsers CANNOT set custom headers on WS upgrades — it's a browser security rule)
			tokenStr = r.URL.Query().Get("token")
		}

		if tokenStr == "" {
			utils.WriteError(w, utils.NewUnauthorized("Missing or invalid Authorization token"))
			return
		}

		// 3. Cryptographically verify the token using the Public Key
		claims, err := auth.ValidateToken(tokenStr)
		if err != nil {
			utils.WriteError(w, utils.NewUnauthorized("Invalid or expired token"))
			return
		}

		// 4. Attach the verified User Identity to the request Context
		// Underlying controllers can trust this ID blindly!
		ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
		ctx = context.WithValue(ctx, UserEmailKey, claims.Email)

		// 5. Allow the request to pass through the Gateway to the real controller
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}
