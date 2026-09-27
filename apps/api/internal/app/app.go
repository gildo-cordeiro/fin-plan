package app

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/budget"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/config"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/cost"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/costitem"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/entry"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/goal"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/item"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/middleware"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/reserve"
	"github.com/gildo-cordeiro/fin-plan/apps/api/migrations"
)

type App struct {
	cfg    *config.Config
	pool   *pgxpool.Pool
	server *http.Server
}

func New(ctx context.Context, cfg *config.Config) (*App, error) {
	a := &App{cfg: cfg}

	if cfg.DatabaseURL != "" {
		poolCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
		defer cancel()

		poolConfig, err := pgxpool.ParseConfig(cfg.DatabaseURL)
		if err != nil {
			log.Printf("[WARN] Falha ao analisar configuração de conexão PostgreSQL: %v", err)
		} else {
			// Por padrão, ativa QueryExecModeExec para compatibilidade com PgBouncer
			// (ex: Supabase em transaction pooling na porta 6543, Neon, etc.), evitando colisões de prepared statements
			if poolConfig.ConnConfig.DefaultQueryExecMode == 0 || poolConfig.ConnConfig.DefaultQueryExecMode == pgx.QueryExecModeCacheStatement {
				poolConfig.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeExec
			}

			pool, err := pgxpool.NewWithConfig(poolCtx, poolConfig)
			if err != nil {
				log.Printf("[WARN] Falha ao inicializar pool PostgreSQL: %v", err)
			} else if err := pool.Ping(poolCtx); err != nil {
				log.Printf("[WARN] Falha ao conectar ao PostgreSQL (%s): %v. O servidor iniciará em modo degradado.", cfg.DatabaseURL, err)
			} else {
				a.pool = pool
				log.Println("[INFO] Conectado ao PostgreSQL com sucesso.")

				if err := ensureSchema(poolCtx, pool); err != nil {
					log.Printf("[ERROR] Falha ao aplicar schema PostgreSQL: %v", err)
				} else {
					log.Println("[INFO] Schema e tabelas do banco de dados verificados com sucesso.")
				}
			}
		}
	} else {
		log.Println("[WARN] DATABASE_URL não configurada. O servidor vai iniciar, mas retornará 503 nas rotas que exigem banco de dados.")
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

	mux.HandleFunc("GET /api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	if a.pool != nil {
		// Repositories
		budgetRepo := budget.NewPostgresRepository(a.pool)
		itemRepo := item.NewPostgresRepository(a.pool)
		entryRepo := entry.NewPostgresRepository(a.pool)
		costRepo := cost.NewPostgresRepository(a.pool)
		costItemRepo := costitem.NewPostgresRepository(a.pool)
		goalRepo := goal.NewPostgresRepository(a.pool)
		reserveRepo := reserve.NewPostgresRepository(a.pool)

		// Services
		budgetSvc := budget.NewService(budgetRepo, itemRepo, costRepo, goalRepo, reserveRepo)
		itemSvc := item.NewService(itemRepo)
		entrySvc := entry.NewService(entryRepo)
		costSvc := cost.NewService(costRepo)
		costItemSvc := costitem.NewService(costItemRepo)
		goalSvc := goal.NewService(goalRepo)
		reserveSvc := reserve.NewService(reserveRepo)

		// Handlers
		budgetH := budget.NewHandler(budgetSvc)
		itemH := item.NewHandler(itemSvc)
		entryH := entry.NewHandler(entrySvc)
		costH := cost.NewHandler(costSvc)
		costItemH := costitem.NewHandler(costItemSvc)
		goalH := goal.NewHandler(goalSvc)
		reserveH := reserve.NewHandler(reserveSvc)

		budgetH.RegisterRoutes(mux)
		itemH.RegisterRoutes(mux)
		entryH.RegisterRoutes(mux)
		costH.RegisterRoutes(mux)
		costItemH.RegisterRoutes(mux)
		goalH.RegisterRoutes(mux)
		reserveH.RegisterRoutes(mux)
	} else {
		unavailableHandler := func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "DATABASE_URL não configurada ou banco indisponível. O servidor está ativo mas sem conexão com o banco de dados.",
			})
		}
		mux.HandleFunc("/api/v1/budgets", unavailableHandler)
		mux.HandleFunc("/api/v1/items", unavailableHandler)
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

	if a.pool != nil {
		a.pool.Close()
		log.Println("[INFO] Conexão PostgreSQL encerrada.")
	}

	log.Println("[INFO] Servidor encerrado com sucesso.")
	return nil
}

func ensureSchema(ctx context.Context, pool *pgxpool.Pool) error {
	if err := migrations.RunMigrations(ctx, pool); err != nil {
		return fmt.Errorf("falha ao executar migrations via goose: %w", err)
	}

	// Garante que o orçamento do ano corrente (2026) exista como baseline se o banco for novo
	_, err := pool.Exec(ctx, `
		INSERT INTO budget (id, year, initial_balance, emergency_reserve_target)
		VALUES ('2026', 2026, 0, 0)
		ON CONFLICT (year) DO NOTHING;
	`)
	if err != nil {
		log.Printf("[WARN] Falha ao criar orçamento baseline para 2026: %v", err)
	}

	return nil
}
