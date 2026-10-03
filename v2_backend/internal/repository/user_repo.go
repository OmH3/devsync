package repository

import (
	"context"

	"github.com/devsync/v2_backend/internal/config"
	"github.com/devsync/v2_backend/internal/models"
)

// CreateUser executes the raw SQL to insert a user, hiding the DB layer from the controller.
func CreateUser(ctx context.Context, email, passwordHash string) (string, error) {
	var newUserID string
	err := config.DB.QueryRow(ctx,
		"INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
		email, passwordHash).Scan(&newUserID)
	return newUserID, err
}

// GetUserByEmail executes the raw SQL to fetch a user securely.
func GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := config.DB.QueryRow(ctx,
		"SELECT id, email, password_hash FROM users WHERE email = $1", email).
		Scan(&user.ID, &user.Email, &user.PasswordHash)
	
	if err != nil {
		return nil, err
	}
	return &user, nil
}
