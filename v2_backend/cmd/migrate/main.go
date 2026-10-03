package main

import (
	"context"
	"log"
	"os"

	"github.com/devsync/v2_backend/internal/config"
)

func main() {
	log.Println("Starting Database Migration...")

	// 1. Load config and connect to DB
	cfg := config.LoadConfig()
	ctx := context.Background()
	config.ConnectDB(ctx, cfg.DatabaseURL)
	defer config.DB.Close()

	// 2. Read the raw SQL schema file we just wrote
	schemaBytes, err := os.ReadFile("internal/models/schema.sql")
	if err != nil {
		log.Fatalf("Failed to read schema.sql: %v", err)
	}

	// 3. Execute the SQL directly against the PostgreSQL database
	_, err = config.DB.Exec(ctx, string(schemaBytes))
	if err != nil {
		log.Fatalf("Failed to execute schema: %v", err)
	}

	log.Println("Migration successful! All 4 tables created in PostgreSQL.")
}
