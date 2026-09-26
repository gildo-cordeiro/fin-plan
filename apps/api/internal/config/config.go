package config

import (
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	MongoDBURI   string
	MongoDBName  string
	APISecretKey string
	Port         string
}

func Load() *Config {
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
