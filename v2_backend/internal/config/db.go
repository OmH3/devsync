package config

import (
	"context"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

// AppConfig holds the global configuration loaded from environment variables
type AppConfig struct {
	DatabaseURL string
	Port        string
}

// DB holds the global database connection pool
var DB *pgxpool.Pool

// LoadConfig reads the .env file and populates the AppConfig struct.
func LoadConfig() *AppConfig {
	// 1. Try to load the .env file. We don't crash if it's missing (e.g. in production Docker)
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, relying on system environment variables")
	}

	// 2. Fetch the variables
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is not set in environment variables")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // Default to 8080 if not specified
	}

	return &AppConfig{
		DatabaseURL: dbURL,
		Port:        port,
	}
}

// ConnectDB establishes a connection pool to PostgreSQL.
func ConnectDB(ctx context.Context, dbURL string) {
	// 1. Create a connection pool configuration
	poolConfig, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		log.Fatalf("Unable to parse DATABASE_URL: %v", err)
	}

	// 2. Establish the connection pool
	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}

	// 3. Ping the database to verify the connection is actually alive
	err = pool.Ping(ctx)
	if err != nil {
		log.Fatalf("Database is not reachable: %v", err)
	}

	log.Println("Successfully connected to PostgreSQL connection pool!")

	// 4. Assign it to our global DB variable
	DB = pool
}
