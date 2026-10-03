package main

import (
	"context"
	"log"

	"github.com/devsync/v2_backend/internal/config"
)

func main() {
	log.Println("Starting DevSync V2 Backend...")

	// 1. Load the configuration (this reads the .env file)
	cfg := config.LoadConfig()
	log.Printf("Loaded Configuration: PORT=%s", cfg.Port)

	// 2. Connect to the Database
	ctx := context.Background()
	config.ConnectDB(ctx, cfg.DatabaseURL)

	// 3. Graceful shutdown
	defer config.DB.Close()
	log.Println("Database connection tested and closed successfully. Ready for further development!")
}
