package httputil

import (
	"github.com/google/uuid"
)

// GenerateUUID returns a new random RFC 4122 UUIDv4 string.
func GenerateUUID() string {
	return uuid.NewString()
}

// IsValidUUID checks whether the given string is a valid UUID.
func IsValidUUID(id string) bool {
	_, err := uuid.Parse(id)
	return err == nil
}
