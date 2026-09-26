package middleware

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
)

func Auth(apiSecretKey string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if apiSecretKey == "" {
				next.ServeHTTP(w, r)
				return
			}

			if r.Method == http.MethodOptions {
				next.ServeHTTP(w, r)
				return
			}

			clientKey := r.Header.Get("x-api-key")
			if clientKey == "" {
				auth := r.Header.Get("Authorization")
				clientKey = strings.TrimPrefix(auth, "Bearer ")
				if clientKey == auth {
					clientKey = strings.TrimPrefix(auth, "bearer ")
				}
			}

			if clientKey == "" || clientKey != apiSecretKey {
				log.Printf("[Auth] Acesso negado — chave inválida ou ausente")
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(map[string]string{
					"error": "Acesso não autorizado. Chave de API ausente ou inválida.",
				})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
