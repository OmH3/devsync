package models

import "time"

// User represents a registered user in the system.
type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"` // The "-" strictly hides this field from being sent in JSON responses (Security!)
	CreatedAt    time.Time `json:"created_at"`
}

// Workspace represents a collaborative space.
type Workspace struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Role      string    `json:"role,omitempty"` // The RBAC role of the user querying it
	CreatedAt time.Time `json:"created_at"`
}

// WorkspaceUser maps which user has which role in a workspace (RBAC).
type WorkspaceUser struct {
	WorkspaceID string    `json:"workspace_id"`
	UserID      string    `json:"user_id"`
	Role        string    `json:"role"` // 'owner', 'editor', 'viewer'
	JoinedAt    time.Time `json:"joined_at"`
}

// File represents a virtual file (code, tiptap docs, or excalidraw state) inside the Postgres DB.
type File struct {
	ID          string    `json:"id"`
	WorkspaceID string    `json:"workspace_id"`
	Name        string    `json:"name"`
	Content     string    `json:"content"`
	UpdatedAt   time.Time `json:"updated_at"`
}
