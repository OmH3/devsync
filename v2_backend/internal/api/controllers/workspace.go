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

// CreateWorkspaceRequest defines the exact strict JSON needed to make a workspace.
type CreateWorkspaceRequest struct {
	Name string `json:"name"`
}

// CreateWorkspace handles POST /workspaces
func CreateWorkspace(w http.ResponseWriter, r *http.Request) {
	// 1. Grab the highly secure User ID injected by our API Gateway Middleware!
	// (We don't need to check if they are authenticated, the Gateway already did)
	userID := r.Context().Value(middleware.UserIDKey).(string)

	// 2. JSON Validation
	var req CreateWorkspaceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteError(w, utils.NewBadRequest("Invalid JSON format"))
		return
	}
	
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		utils.WriteError(w, utils.NewBadRequest("Workspace name cannot be empty"))
		return
	}

	// 3. Database Execution via Repository
	ws, err := repository.CreateWorkspace(r.Context(), req.Name, userID)
	if err != nil {
		utils.WriteError(w, utils.NewInternal("Failed to create workspace", err))
		return
	}

	// 4. Return Success
	utils.WriteJSON(w, http.StatusCreated, ws)
}

// GetWorkspaces handles GET /workspaces
func GetWorkspaces(w http.ResponseWriter, r *http.Request) {
	// 1. Grab the secure User ID from the Gateway
	userID := r.Context().Value(middleware.UserIDKey).(string)

	// 2. Fetch the data from Repository
	workspaces, err := repository.GetWorkspacesForUser(r.Context(), userID)
	if err != nil {
		utils.WriteError(w, utils.NewInternal("Failed to fetch workspaces", err))
		return
	}

	// 3. Prevent null slice in JSON representation
	if workspaces == nil {
		workspaces = []models.Workspace{}
	}

	// 4. Return Success
	utils.WriteJSON(w, http.StatusOK, workspaces)
}


// InviteRequest defines the exact strict JSON needed to invite a teammate.
type InviteRequest struct {
	WorkspaceID string `json:"workspace_id"`
	Email       string `json:"email"`
	Role        string `json:"role"` // 'editor' or 'viewer'
}

// InviteUser handles POST /workspaces/invite
func InviteUser(w http.ResponseWriter, r *http.Request) {
	// 1. Get the current UserID (The person attempting to send the invite) from the Gateway context
	inviterID := r.Context().Value(middleware.UserIDKey).(string)

	// 2. Decode JSON
	var req InviteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteError(w, utils.NewBadRequest("Invalid JSON format"))
		return
	}

	if req.Role != "editor" && req.Role != "viewer" {
		utils.WriteError(w, utils.NewBadRequest("Role must be 'editor' or 'viewer'"))
		return
	}

	// 3. RBAC Check: Ensure the person sending the invite is actually the 'owner'
	role, err := repository.GetUserRole(r.Context(), req.WorkspaceID, inviterID)
	if err != nil || role != "owner" {
		utils.WriteError(w, utils.NewForbidden("Only workspace owners can invite users"))
		return
	}

	// 4. Find the User being invited by their Email
	userToInvite, err := repository.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		utils.WriteError(w, utils.NewNotFound("User with this email not found"))
		return
	}

	// 5. Add them to the Workspace
	err = repository.AddUserToWorkspace(r.Context(), req.WorkspaceID, userToInvite.ID, req.Role)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key value") {
			utils.WriteError(w, utils.NewBadRequest("User is already in this workspace"))
			return
		}
		utils.WriteError(w, utils.NewInternal("Failed to add user to workspace", err))
		return
	}

	// 6. Return Success
	utils.WriteJSON(w, http.StatusOK, map[string]string{
		"message": "User invited successfully as " + req.Role,
	})
}

// JoinRequest defines the payload for a user joining via a shared ID
type JoinRequest struct {
	WorkspaceID string `json:"workspace_id"`
}

// JoinWorkspace handles POST /workspaces/join (User joins via shared ID)
func JoinWorkspace(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)

	var req JoinRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteError(w, utils.NewBadRequest("Invalid JSON format"))
		return
	}

	req.WorkspaceID = strings.TrimSpace(req.WorkspaceID)
	if req.WorkspaceID == "" {
		utils.WriteError(w, utils.NewBadRequest("Workspace ID cannot be empty"))
		return
	}

	// Add them directly as an editor (for open-join workspaces)
	err := repository.AddUserToWorkspace(r.Context(), req.WorkspaceID, userID, "editor")
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key value") {
			utils.WriteError(w, utils.NewBadRequest("You are already in this workspace"))
			return
		}
		// If the foreign key violation occurs, it means the workspace doesn't exist
		if strings.Contains(err.Error(), "foreign key constraint") {
			utils.WriteError(w, utils.NewNotFound("Workspace ID does not exist"))
			return
		}
		// If it's an invalid UUID format
		if strings.Contains(err.Error(), "invalid input syntax for type uuid") || strings.Contains(err.Error(), "SQLSTATE 22P02") {
			utils.WriteError(w, utils.NewBadRequest("Invalid Workspace ID format. Must be a full UUID."))
			return
		}
		utils.WriteError(w, utils.NewInternal("Failed to join workspace", err))
		return
	}

	utils.WriteJSON(w, http.StatusOK, map[string]string{
		"message": "Successfully joined workspace",
	})
}


// GetWorkspaceRole handles GET /workspaces/role?workspace_id=...
func GetWorkspaceRole(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	
	workspaceID := r.URL.Query().Get("workspace_id")
	if workspaceID == "" {
		utils.WriteError(w, utils.NewBadRequest("workspace_id query parameter is required"))
		return
	}

	role, err := repository.GetUserRole(r.Context(), workspaceID, userID)
	if err != nil {
		utils.WriteError(w, utils.NewForbidden("You do not have access to this workspace"))
		return
	}

	utils.WriteJSON(w, http.StatusOK, map[string]string{"role": role})
}


// GetWorkspaceMembers handles GET /workspaces/members?workspace_id=...
func GetWorkspaceMembers(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	
	workspaceID := r.URL.Query().Get("workspace_id")
	if workspaceID == "" {
		utils.WriteError(w, utils.NewBadRequest("workspace_id query parameter is required"))
		return
	}

	// RBAC Check: Ensure the requester is actually in the workspace
	_, err := repository.GetUserRole(r.Context(), workspaceID, userID)
	if err != nil {
		utils.WriteError(w, utils.NewForbidden("You do not have access to this workspace"))
		return
	}

	members, err := repository.GetWorkspaceMembers(r.Context(), workspaceID)
	if err != nil {
		utils.WriteError(w, utils.NewInternal("Failed to fetch members", err))
		return
	}

	utils.WriteJSON(w, http.StatusOK, members)
}

// UpdateRoleRequest defines the JSON needed to update a member's role
type UpdateRoleRequest struct {
	WorkspaceID  string `json:"workspace_id"`
	TargetUserID string `json:"user_id"`
	NewRole      string `json:"role"`
}

// UpdateWorkspaceRole handles PUT /workspaces/members/role
func UpdateWorkspaceRole(w http.ResponseWriter, r *http.Request) {
	ownerID := r.Context().Value(middleware.UserIDKey).(string)

	var req UpdateRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteError(w, utils.NewBadRequest("Invalid JSON format"))
		return
	}

	if req.NewRole != "editor" && req.NewRole != "viewer" {
		utils.WriteError(w, utils.NewBadRequest("Role must be 'editor' or 'viewer'"))
		return
	}

	// 1. Enforce RBAC: The person making the request MUST be the 'owner'
	role, err := repository.GetUserRole(r.Context(), req.WorkspaceID, ownerID)
	if err != nil || role != "owner" {
		utils.WriteError(w, utils.NewForbidden("Only the workspace owner can change member roles"))
		return
	}

	// 2. Prevent the owner from changing their own role accidentally and locking themselves out
	if ownerID == req.TargetUserID {
		utils.WriteError(w, utils.NewBadRequest("Owners cannot change their own role"))
		return
	}

	// 3. Update the role in the database
	err = repository.UpdateUserRole(r.Context(), req.WorkspaceID, req.TargetUserID, req.NewRole)
	if err != nil {
		utils.WriteError(w, utils.NewInternal("Failed to update user role", err))
		return
	}

	utils.WriteJSON(w, http.StatusOK, map[string]string{
		"message": "User role updated successfully",
	})
}
