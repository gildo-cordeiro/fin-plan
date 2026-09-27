package config

import (
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL  string
	APISecretKey string
	Port         string
}

func Load() *Config {
	_ = godotenv.Load()

	dbURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if dbURL == "" {
		// Suporte a variáveis postgres legadas ou individuais se fornecidas
		dbURL = "postgres://postgres:postgres@localhost:5432/finplan?sslmode=disable"
	}

	return &Config{
		DatabaseURL:  dbURL,
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
