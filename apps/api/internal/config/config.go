package config

import (
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL    string
	APISecretKey   string
	Port           string
	AllowedOrigins []string
}

func Load() *Config {
	_ = godotenv.Load()

	dbURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if dbURL == "" {
		// Suporte a variáveis postgres legadas ou individuais se fornecidas
		dbURL = "postgres://postgres:postgres@localhost:5432/finplan?sslmode=disable"
	}

	originsRaw := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS"))
	var origins []string
	if originsRaw == "" {
		origins = []string{"http://localhost:5173", "http://localhost:3000"}
	} else {
		for _, o := range strings.Split(originsRaw, ",") {
			origins = append(origins, strings.TrimSpace(o))
		}
	}

	return &Config{
		DatabaseURL:    dbURL,
		APISecretKey:   strings.TrimSpace(os.Getenv("API_SECRET_KEY")),
		Port:           getEnvOrDefault("PORT", "8080"),
		AllowedOrigins: origins,
	}
}

func getEnvOrDefault(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}
