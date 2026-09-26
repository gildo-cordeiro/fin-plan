// Package main is the entry point for the FinPlan Go backend.
// It reads configuration, connects to MongoDB Atlas, wires up the HTTP router,
// and starts the server with graceful shutdown on SIGTERM/SIGINT.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/budget"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/config"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/middleware"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	cfg := config.Load()

	// --- Validate critical config early ---
	if cfg.MongoDBURI == "" {
		log.Println("[WARN] MONGODB_URI não configurada. O servidor vai iniciar, mas retornará 503 nas rotas de budget.")
	}

	// --- MongoDB connection (singleton, reused for the process lifetime) ---
	var mongoClient *mongo.Client
	if cfg.MongoDBURI != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		clientOpts := options.Client().
			ApplyURI(cfg.MongoDBURI).
			SetServerSelectionTimeout(8 * time.Second)

		var err error
		mongoClient, err = mongo.Connect(ctx, clientOpts)
		if err != nil {
			log.Fatalf("[FATAL] Falha ao conectar ao MongoDB: %v", err)
		}

		// Verify connection
		if err := mongoClient.Ping(ctx, nil); err != nil {
			log.Fatalf("[FATAL] Falha no ping ao MongoDB: %v", err)
		}
		log.Println("[INFO] Conectado ao MongoDB Atlas com sucesso.")
	}

	// --- Build HTTP mux ---
	mux := http.NewServeMux()

	// Health check — always available, no auth required
	mux.HandleFunc("/api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	// Budget endpoints — guarded by MongoDB availability
	if mongoClient != nil {
		db := mongoClient.Database(cfg.MongoDBName)
		repo := budget.NewRepository(db)
		handler := budget.NewHandler(repo)

		mux.Handle("/api/v1/budget", handler)
	} else {
		// If no MongoDB URI, return 503 for budget routes (same contract as api/budget.ts).
		mux.HandleFunc("/api/v1/budget", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "MONGODB_URI não configurada nas variáveis de ambiente da Vercel. Adicione MONGODB_URI nas variáveis do projeto na Vercel (Project Settings -> Environment Variables).",
			})
		})
	}

	// --- Apply middleware chain: CORS → Auth → mux ---
	var handler http.Handler = mux
	handler = middleware.Auth(cfg.APISecretKey)(handler)
	handler = middleware.CORS()(handler)

	// --- HTTP Server with explicit timeouts ---
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// --- Start server in a goroutine ---
	go func() {
		log.Printf("[INFO] Servidor iniciado na porta %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[FATAL] ListenAndServe: %v", err)
		}
	}()

	// --- Graceful shutdown on SIGTERM / SIGINT ---
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit
	log.Printf("[INFO] Sinal recebido (%s). Iniciando shutdown graceful...", sig)

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("[ERROR] Erro no shutdown do servidor HTTP: %v", err)
	}

	if mongoClient != nil {
		if err := mongoClient.Disconnect(shutdownCtx); err != nil {
			log.Printf("[ERROR] Erro ao desconectar do MongoDB: %v", err)
		} else {
			log.Println("[INFO] Conexão MongoDB encerrada.")
		}
	}

	log.Println("[INFO] Servidor encerrado com sucesso.")
}
