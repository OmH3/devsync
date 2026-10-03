package main

import (
	"log/slog"

	"github.com/devsync/v2_backend/internal/logger"
)

func main() {
	// 1. Initialize our custom logger
	logger.Setup()

	// 2. Log a standard info message with an extra field
	slog.Info("Server started successfully", "port", 8080)

	// 3. Log a warning message
	slog.Warn("High memory usage detected", "memory_mb", 450)

	// 4. Log an error with highly specific context tags (Grafana will index these perfectly)
	slog.Error("Database connection failed",
		slog.String("db_host", "localhost"),
		slog.Int("retry_count", 3),
		slog.String("user_id", "123e4567-e89b-12d3-a456-426614174000"),
	)
}
