package controllers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/devsync/v2_backend/internal/api/middleware"
	"github.com/devsync/v2_backend/internal/api/utils"
	"github.com/devsync/v2_backend/internal/models"
	"github.com/devsync/v2_backend/internal/repository"
)

type FileRequest struct {
	WorkspaceID string `json:"workspace_id"`
	Name        string `json:"name"`
}

// CreateFile handles POST /files
func CreateFile(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)

	var req FileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteError(w, utils.NewBadRequest("Invalid JSON format"))
		return
	}
	
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" || req.WorkspaceID == "" {
		utils.WriteError(w, utils.NewBadRequest("workspace_id and name are required"))
		return
	}

	// RBAC: Only Owners and Editors can create files
	role, err := repository.GetUserRole(r.Context(), req.WorkspaceID, userID)
	if err != nil || (role != "owner" && role != "editor") {
		utils.WriteError(w, utils.NewForbidden("You do not have permission to create files in this workspace"))
		return
	}

	file, err := repository.CreateFile(r.Context(), req.WorkspaceID, req.Name)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key value") {
			utils.WriteError(w, utils.NewBadRequest("A file with this name already exists"))
			return
		}
		utils.WriteError(w, utils.NewInternal("Failed to create file", err))
		return
	}

	utils.WriteJSON(w, http.StatusCreated, file)
}

// ListFiles handles GET /files?workspace_id=...
func ListFiles(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	
	workspaceID := r.URL.Query().Get("workspace_id")
	if workspaceID == "" {
		utils.WriteError(w, utils.NewBadRequest("workspace_id query parameter is required"))
		return
	}

	// RBAC: Any member (Owner, Editor, Viewer) can view the file tree
	_, err := repository.GetUserRole(r.Context(), workspaceID, userID)
	if err != nil {
		utils.WriteError(w, utils.NewForbidden("You do not have access to this workspace"))
		return
	}

	files, err := repository.GetFilesByWorkspace(r.Context(), workspaceID)
	if err != nil {
		utils.WriteError(w, utils.NewInternal("Failed to fetch files", err))
		return
	}

	if files == nil {
		files = []models.File{}
	}

	utils.WriteJSON(w, http.StatusOK, files)
}

// DeleteFile handles DELETE /files?workspace_id=...&file_id=...
func DeleteFile(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)

	workspaceID := r.URL.Query().Get("workspace_id")
	fileID := r.URL.Query().Get("file_id")

	if workspaceID == "" || fileID == "" {
		utils.WriteError(w, utils.NewBadRequest("workspace_id and file_id query parameters are required"))
		return
	}

	// RBAC: Only Owners and Editors can delete files
	role, err := repository.GetUserRole(r.Context(), workspaceID, userID)
	if err != nil || (role != "owner" && role != "editor") {
		utils.WriteError(w, utils.NewForbidden("You do not have permission to delete files in this workspace"))
		return
	}

	err = repository.DeleteFile(r.Context(), fileID, workspaceID)
	if err != nil {
		utils.WriteError(w, utils.NewInternal("Failed to delete file", err))
		return
	}

	utils.WriteJSON(w, http.StatusOK, map[string]string{"message": "File deleted successfully"})
}

// UpdateFile handles PUT /files
func UpdateFile(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)

	var req struct {
		WorkspaceID string `json:"workspace_id"`
		Name        string `json:"name"`
		Content     string `json:"content"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteError(w, utils.NewBadRequest("Invalid JSON format"))
		return
	}
	
	if req.WorkspaceID == "" || req.Name == "" {
		utils.WriteError(w, utils.NewBadRequest("workspace_id and name are required"))
		return
	}

	// RBAC: Only Owners and Editors can save files
	role, err := repository.GetUserRole(r.Context(), req.WorkspaceID, userID)
	if err != nil || (role != "owner" && role != "editor") {
		utils.WriteError(w, utils.NewForbidden("You do not have permission to save files in this workspace"))
		return
	}

	err = repository.UpdateFileContent(r.Context(), req.WorkspaceID, req.Name, req.Content)
	if err != nil {
		utils.WriteError(w, utils.NewInternal("Failed to save file", err))
		return
	}

	utils.WriteJSON(w, http.StatusOK, map[string]string{"message": "File saved successfully"})
}
