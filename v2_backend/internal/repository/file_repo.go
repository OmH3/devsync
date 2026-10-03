package repository

import (
	"context"

	"github.com/devsync/v2_backend/internal/config"
	"github.com/devsync/v2_backend/internal/models"
)

// CreateFile adds a new file to the workspace
func CreateFile(ctx context.Context, workspaceID, name string) (*models.File, error) {
	var file models.File
	err := config.DB.QueryRow(ctx,
		"INSERT INTO files (workspace_id, name) VALUES ($1, $2) RETURNING id, workspace_id, name, content, updated_at",
		workspaceID, name).Scan(&file.ID, &file.WorkspaceID, &file.Name, &file.Content, &file.UpdatedAt)
	
	if err != nil {
		return nil, err
	}
	return &file, nil
}

// GetFilesByWorkspace gets all files to populate the frontend File Tree sidebar
func GetFilesByWorkspace(ctx context.Context, workspaceID string) ([]models.File, error) {
	rows, err := config.DB.Query(ctx,
		"SELECT id, workspace_id, name, content, updated_at FROM files WHERE workspace_id = $1 ORDER BY name ASC",
		workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []models.File
	for rows.Next() {
		var f models.File
		if err := rows.Scan(&f.ID, &f.WorkspaceID, &f.Name, &f.Content, &f.UpdatedAt); err != nil {
			return nil, err
		}
		files = append(files, f)
	}
	return files, nil
}

// DeleteFile securely deletes a file, ensuring it belongs to the specified workspace
func DeleteFile(ctx context.Context, fileID, workspaceID string) error {
	result, err := config.DB.Exec(ctx, "DELETE FROM files WHERE id = $1 AND workspace_id = $2", fileID, workspaceID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return context.DeadlineExceeded // Or custom not found error
	}
	return nil
}

// UpdateFileContent updates (or inserts) the actual text content of a file in PostgreSQL
func UpdateFileContent(ctx context.Context, workspaceID, name, content string) error {
	_, err := config.DB.Exec(ctx, 
		`INSERT INTO files (workspace_id, name, content) 
		 VALUES ($1, $2, $3) 
		 ON CONFLICT (workspace_id, name) 
		 DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()`, 
		workspaceID, name, content)
	return err
}
