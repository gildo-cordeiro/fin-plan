package migrations

import (
	"context"
	"embed"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

//go:embed *.sql
var EmbedMigrations embed.FS

// RunMigrations executa todas as migrations pendentes no banco usando Goose.
// Configura explicitamente o PostgreSQL Simple Protocol para garantir compatibilidade
// total com connection poolers (ex: PgBouncer do Supabase/Neon em transaction mode)
// e evitar colisões de prepared statements (SQLSTATE 08P01 / 42P05).
func RunMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	if pool == nil {
		return fmt.Errorf("pool de conexões PostgreSQL não inicializado")
	}

	connConfig := pool.Config().ConnConfig.Copy()
	connConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	db := stdlib.OpenDB(*connConfig)
	db.SetMaxOpenConns(1)
	defer db.Close()

	goose.SetBaseFS(EmbedMigrations)

	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("falha ao configurar dialeto do goose: %w", err)
	}

	if err := goose.UpContext(ctx, db, "."); err != nil {
		return fmt.Errorf("falha ao executar migrations via goose: %w", err)
	}

	return nil
}
