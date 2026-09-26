package app

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/budget"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/config"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/cost"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/goal"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/item"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/middleware"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type App struct {
	cfg         *config.Config
	mongoClient *mongo.Client
	server      *http.Server
}

func New(ctx context.Context, cfg *config.Config) (*App, error) {
	a := &App{cfg: cfg}

	if cfg.MongoDBURI != "" {
		client, err := connectMongo(ctx, cfg.MongoDBURI)
		if err != nil {
			return nil, fmt.Errorf("falha ao conectar ao MongoDB: %w", err)
		}
		a.mongoClient = client
		log.Println("[INFO] Conectado ao MongoDB Atlas com sucesso.")

		if err := ensureIndexes(ctx, client.Database(cfg.MongoDBName)); err != nil {
			log.Printf("[WARN] Falha ao verificar/criar índices do MongoDB: %v", err)
		}
	} else {
		log.Println("[WARN] MONGODB_URI não configurada. O servidor vai iniciar, mas retornará 503 nas rotas que exigem banco de dados.")
	}

	router := a.routes()
	var handler http.Handler = router
	handler = middleware.Auth(cfg.APISecretKey)(handler)
	handler = middleware.CORS()(handler)

	a.server = &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	return a, nil
}

func (a *App) routes() *http.ServeMux {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	if a.mongoClient != nil {
		// Atomic budget-items
		itemRepo := item.NewMongoRepository(a.mongoClient, a.cfg.MongoDBName)
		itemSvc := item.NewService(itemRepo)
		itemH := item.NewHandler(itemSvc)
		itemH.RegisterRoutes(mux)

		// Atomic one-time-costs
		costRepo := cost.NewMongoRepository(a.mongoClient, a.cfg.MongoDBName)
		costSvc := cost.NewService(costRepo)
		costH := cost.NewHandler(costSvc)
		costH.RegisterRoutes(mux)

		// Atomic goals & contributions
		goalRepo := goal.NewMongoRepository(a.mongoClient, a.cfg.MongoDBName)
		goalSvc := goal.NewService(goalRepo)
		goalH := goal.NewHandler(goalSvc)
		goalH.RegisterRoutes(mux)

		// Budget years, months and aggregated view model
		yearRepo := budget.NewMongoRepository(a.mongoClient, a.cfg.MongoDBName)
		yearSvc := budget.NewService(yearRepo)
		yearH := budget.NewHandler(yearSvc)
		yearH.RegisterRoutes(mux)
	} else {
		unavailableHandler := func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "MONGODB_URI não configurada nas variáveis de ambiente. O servidor está ativo mas sem conexão com o banco de dados.",
			})
		}
		mux.HandleFunc("GET /api/v1/budget-years", unavailableHandler)
		mux.HandleFunc("GET /api/v1/budget-items", unavailableHandler)
	}

	return mux
}

func (a *App) Run(ctx context.Context) error {
	serverErr := make(chan error, 1)

	go func() {
		log.Printf("[INFO] Servidor iniciado na porta %s", a.cfg.Port)
		if err := a.server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErr <- err
		}
	}()

	select {
	case <-ctx.Done():
		log.Println("[INFO] Sinal de encerramento recebido. Iniciando shutdown graceful...")
	case err := <-serverErr:
		return fmt.Errorf("erro no servidor HTTP: %w", err)
	}

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := a.server.Shutdown(shutdownCtx); err != nil {
		log.Printf("[ERROR] Erro no shutdown do servidor HTTP: %v", err)
	}

	if a.mongoClient != nil {
		if err := a.mongoClient.Disconnect(shutdownCtx); err != nil {
			log.Printf("[ERROR] Erro ao desconectar do MongoDB: %v", err)
		} else {
			log.Println("[INFO] Conexão MongoDB encerrada.")
		}
	}

	log.Println("[INFO] Servidor encerrado com sucesso.")
	return nil
}

func connectMongo(ctx context.Context, uri string) (*mongo.Client, error) {
	connCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	clientOpts := options.Client().
		ApplyURI(uri).
		SetServerSelectionTimeout(8 * time.Second)

	client, err := mongo.Connect(connCtx, clientOpts)
	if err != nil {
		return nil, err
	}

	if err := client.Ping(connCtx, nil); err != nil {
		return nil, err
	}

	return client, nil
}

func ensureIndexes(ctx context.Context, db *mongo.Database) error {
	idxCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	// Limpeza de collections legadas (ambiente sem dados de produção a preservar)
	_ = db.Collection("months").Drop(idxCtx)
	_ = db.Collection("budget_years").Drop(idxCtx)
	_ = db.Collection("budget_items").Drop(idxCtx)
	_ = db.Collection("one_time_costs").Drop(idxCtx)

	// Index: budgets.year (unique)
	_, err := db.Collection(budget.CollectionBudgets).Indexes().CreateOne(idxCtx, mongo.IndexModel{
		Keys:    bson.D{{Key: "year", Value: 1}},
		Options: options.Index().SetUnique(true).SetName("idx_budgets_year_unique"),
	})
	if err != nil {
		return err
	}

	// Index: costs.targetMonthId
	_, err = db.Collection(cost.CollectionName).Indexes().CreateOne(idxCtx, mongo.IndexModel{
		Keys:    bson.D{{Key: "targetMonthId", Value: 1}},
		Options: options.Index().SetName("idx_costs_targetMonthId"),
	})
	if err != nil {
		return err
	}

	// Index: items.type
	_, err = db.Collection(item.CollectionName).Indexes().CreateOne(idxCtx, mongo.IndexModel{
		Keys:    bson.D{{Key: "type", Value: 1}},
		Options: options.Index().SetName("idx_items_type"),
	})
	return err
}
