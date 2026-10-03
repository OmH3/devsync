package utils

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

// APIResponse represents the standard JSON envelope for all API responses
type APIResponse struct {
	Success bool   `json:"success"`
	Code    int    `json:"code"`
	Data    any    `json:"data,omitempty"`
	Error   string `json:"error,omitempty"`
}

// WriteJSON sends a successful JSON response
func WriteJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(APIResponse{
		Success: true,
		Code:    status,
		Data:    data,
	})
}

// WriteError sends a standardized JSON error response AND logs it to Grafana automatically
func WriteError(w http.ResponseWriter, appErr *AppError) {
	// If it's a 500 internal error, log the actual hidden error for debugging via Grafana
	if appErr.StatusCode >= 500 {
		slog.Error("Internal Server Error Triggered", "msg", appErr.Message, "details", appErr.Err)
	} else {
		// Just a client error (e.g., bad password), log it as a warning
		slog.Warn("Client Error Triggered", "status", appErr.StatusCode, "msg", appErr.Message)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(appErr.StatusCode)
	
	// Send the safe error message to the frontend Next.js app
	json.NewEncoder(w).Encode(APIResponse{
		Success: false,
		Code:    appErr.StatusCode,
		Error:   appErr.Message,
	})
}
