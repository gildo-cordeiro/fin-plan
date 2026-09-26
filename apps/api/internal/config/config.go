// Package config reads application configuration from environment variables,
// following 12-factor app conventions.
package config

import (
	"os"
	"strings"

	"github.com/joho/godotenv"
)

// Config holds all application settings read from environment variables.
type Config struct {
	// MongoDBURI is the MongoDB Atlas connection string (required).
	MongoDBURI string
	// MongoDBName is the database name. Defaults to "finplan".
	MongoDBName string
	// APISecretKey is the optional API key for authentication.
	// If empty, authentication is disabled (open mode).
	APISecretKey string
	// Port is the HTTP server listen port. Defaults to "8080".
	Port string
}

// Load reads configuration from environment variables.
// In development, it also loads from a .env file if present (non-fatal if missing).
func Load() *Config {
	// Load .env if present — ignore errors (file may not exist in production).
	_ = godotenv.Load()

	return &Config{
		MongoDBURI:   strings.TrimSpace(os.Getenv("MONGODB_URI")),
		MongoDBName:  getEnvOrDefault("MONGODB_DB_NAME", "finplan"),
		APISecretKey: strings.TrimSpace(os.Getenv("API_SECRET_KEY")),
		Port:         getEnvOrDefault("PORT", "8080"),
	}
}

func getEnvOrDefault(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}
