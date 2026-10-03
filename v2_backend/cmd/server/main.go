package main

import (
	"context"
	"net/http"
	"log/slog"
	"os"

	"github.com/devsync/v2_backend/internal/api/controllers"
	"github.com/devsync/v2_backend/internal/api/middleware"
	"github.com/devsync/v2_backend/internal/auth"
	"github.com/devsync/v2_backend/internal/config"
	"github.com/devsync/v2_backend/internal/logger"
)

// CORSMiddleware allows our Next.js frontend (port 3000) to talk to this Go backend (port 8080)
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*") // In production, restrict to frontend domain
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		
		// Handle preflight OPTIONS requests instantly
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		next.ServeHTTP(w, r)
	})
}

func main() {
	// 1. Initialize Infrastructure
	logger.Setup()
	auth.LoadKeys()
	
	ctx := context.Background()
	config.ConnectDB(ctx, config.LoadConfig().DatabaseURL)
	defer config.DB.Close()

	// 2. Setup Router
	mux := http.NewServeMux()

	// 3. Public Routes (No Auth required)
	mux.HandleFunc("/signup", controllers.Signup)
	mux.HandleFunc("/login", controllers.Login)

	mux.HandleFunc("/auth/refresh", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			controllers.RefreshTokens(w, r)
		}
	})
	mux.HandleFunc("/auth/logout", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			controllers.Logout(w, r)
		}
	})


	// 4. Protected Routes (Wrapped in AuthGateway)
	mux.Handle("/workspaces", middleware.AuthGateway(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			controllers.CreateWorkspace(w, r)
		} else if r.Method == "GET" {
			controllers.GetWorkspaces(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	
	mux.Handle("/workspaces/role", middleware.AuthGateway(controllers.GetWorkspaceRole))
	mux.Handle("/workspaces/members", middleware.AuthGateway(controllers.GetWorkspaceMembers))
	
	mux.Handle("/workspaces/members/role", middleware.AuthGateway(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "PUT" {
			controllers.UpdateWorkspaceRole(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	mux.Handle("/workspaces/invite", middleware.AuthGateway(controllers.InviteUser))
	mux.Handle("/workspaces/join", middleware.AuthGateway(controllers.JoinWorkspace))

	mux.Handle("/files", middleware.AuthGateway(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			controllers.CreateFile(w, r)
		} else if r.Method == "GET" {
			controllers.ListFiles(w, r)
		} else if r.Method == "DELETE" {
			controllers.DeleteFile(w, r)
		} else if r.Method == "PUT" {
			controllers.UpdateFile(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	mux.Handle("/run", middleware.AuthGateway(controllers.RunCode))
	mux.Handle("/ws", middleware.AuthGateway(controllers.ConnectYjsWebsocket))
	mux.Handle("/webrtc/join", middleware.AuthGateway(controllers.JoinAudioRoom))

	// 5. Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	
	slog.Info("🚀 DevSync V2 Master API Server starting", "port", port)
	
	// Wrap the entire router in CORS so the browser doesn't block requests
	err := http.ListenAndServe(":"+port, CORSMiddleware(mux))
	if err != nil {
		slog.Error("Server failed to start", "error", err)
		os.Exit(1)
	}
}
