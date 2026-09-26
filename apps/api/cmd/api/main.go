package main

import (
	"context"
	"log"
	"os/signal"
	"syscall"

	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/app"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/config"
)

func main() {
	cfg := config.Load()

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	application, err := app.New(ctx, cfg)
	if err != nil {
		log.Fatalf("[FATAL] Falha ao inicializar app: %v", err)
	}

	if err := application.Run(ctx); err != nil {
		log.Fatalf("[FATAL] Falha na execução da app: %v", err)
	}
}
