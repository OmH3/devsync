package controllers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/devsync/v2_backend/internal/api/middleware"
	"github.com/devsync/v2_backend/internal/api/utils"
	"github.com/devsync/v2_backend/internal/repository"
	"github.com/devsync/v2_backend/internal/runner"
)

type RunCodeRequest struct {
	WorkspaceID string `json:"workspace_id"`
	Language    string `json:"language"`
	Code        string `json:"code"`
}

// RunCode handles POST /run
func RunCode(w http.ResponseWriter, r *http.Request) {
	// 1. Identity Verification via Gateway
	userID := r.Context().Value(middleware.UserIDKey).(string)

	// 2. Decode JSON
	var req RunCodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteError(w, utils.NewBadRequest("Invalid JSON format"))
		return
	}
	
	req.Language = strings.TrimSpace(strings.ToLower(req.Language))
	if req.Code == "" {
		utils.WriteError(w, utils.NewBadRequest("Code cannot be empty"))
		return
	}

	// 3. RBAC SECURITY CHECK!
	// Only allow people who are actually in the workspace to run code using our server resources
	role, err := repository.GetUserRole(r.Context(), req.WorkspaceID, userID)
	if err != nil || (role != "owner" && role != "editor") {
		utils.WriteError(w, utils.NewForbidden("Viewers are not allowed to execute code in this workspace"))
		return
	}

	// 4. Route to the correct Execution Engine
	var result runner.RunResult
	switch req.Language {
	case "python":
		result = runner.ExecutePython(req.Code)
	case "cpp":
		result = runner.ExecuteCPP(req.Code)
	case "java":
		result = runner.ExecuteJava(req.Code)
	default:
		utils.WriteError(w, utils.NewBadRequest("Unsupported language: "+req.Language))
		return
	}

	// 5. Return Output
	utils.WriteJSON(w, http.StatusOK, result)
}
