package repository

import (
	"context"

	"github.com/devsync/v2_backend/internal/config"
	"github.com/devsync/v2_backend/internal/models"
)

// CreateWorkspace safely creates a workspace and assigns the creator as the 'owner' in one transaction.
func CreateWorkspace(ctx context.Context, name, ownerID string) (*models.Workspace, error) {
	// 1. Begin a Database Transaction (If assigning the owner fails, creating the workspace is reversed)
	tx, err := config.DB.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// 2. Create the Workspace
	var ws models.Workspace
	err = tx.QueryRow(ctx,
		"INSERT INTO workspaces (name) VALUES ($1) RETURNING id, name, created_at",
		name).Scan(&ws.ID, &ws.Name, &ws.CreatedAt)
	if err != nil {
		return nil, err
	}

	// 3. Assign the user as 'owner' in the RBAC table
	_, err = tx.Exec(ctx,
		"INSERT INTO workspace_users (workspace_id, user_id, role) VALUES ($1, $2, $3)",
		ws.ID, ownerID, "owner")
	if err != nil {
		return nil, err
	}

	// 4. Commit the transaction permanently
	err = tx.Commit(ctx)
	if err != nil {
		return nil, err
	}

	return &ws, nil
}

// GetWorkspacesForUser safely fetches all workspaces the user has access to.
func GetWorkspacesForUser(ctx context.Context, userID string) ([]models.Workspace, error) {
	// Use an INNER JOIN to only fetch workspaces where the user is listed in workspace_users
	// We also fetch their specific role!
	rows, err := config.DB.Query(ctx,
		`SELECT w.id, w.name, w.created_at, wu.role 
		 FROM workspaces w 
		 JOIN workspace_users wu ON w.id = wu.workspace_id 
		 WHERE wu.user_id = $1 ORDER BY w.created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var workspaces []models.Workspace
	for rows.Next() {
		var ws models.Workspace
		if err := rows.Scan(&ws.ID, &ws.Name, &ws.CreatedAt, &ws.Role); err != nil {
			return nil, err
		}
		workspaces = append(workspaces, ws)
	}
	return workspaces, nil
}


// AddUserToWorkspace assigns a role to a user in a specific workspace.
func AddUserToWorkspace(ctx context.Context, workspaceID, newUserID, role string) error {
	_, err := config.DB.Exec(ctx,
		"INSERT INTO workspace_users (workspace_id, user_id, role) VALUES ($1, $2, $3)",
		workspaceID, newUserID, role)
	return err
}

// GetUserRole securely checks if a user is in a workspace and returns their RBAC role.
func GetUserRole(ctx context.Context, workspaceID, userID string) (string, error) {
	var role string
	err := config.DB.QueryRow(ctx,
		"SELECT role FROM workspace_users WHERE workspace_id = $1 AND user_id = $2",
		workspaceID, userID).Scan(&role)
	return role, err
}


// WorkspaceMember represents a user inside a workspace for the Team UI.
type WorkspaceMember struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

// GetWorkspaceMembers fetches all users in a specific workspace.
func GetWorkspaceMembers(ctx context.Context, workspaceID string) ([]WorkspaceMember, error) {
	rows, err := config.DB.Query(ctx,
		`SELECT u.id, u.email, wu.role 
		 FROM users u 
		 JOIN workspace_users wu ON u.id = wu.user_id 
		 WHERE wu.workspace_id = $1 ORDER BY wu.role = 'owner' DESC, u.email ASC`, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []WorkspaceMember
	for rows.Next() {
		var m WorkspaceMember
		if err := rows.Scan(&m.ID, &m.Email, &m.Role); err != nil {
			return nil, err
		}
		members = append(members, m)
	}
	return members, nil
}

// UpdateUserRole updates a specific user's role in a workspace.
func UpdateUserRole(ctx context.Context, workspaceID, targetUserID, newRole string) error {
	_, err := config.DB.Exec(ctx,
		"UPDATE workspace_users SET role = $1 WHERE workspace_id = $2 AND user_id = $3",
		newRole, workspaceID, targetUserID)
	return err
}
