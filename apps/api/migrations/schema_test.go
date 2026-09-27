package migrations

import (
	"math"
	"testing"

	"github.com/pressly/goose/v3"
)

func TestGooseEmbedMigrations(t *testing.T) {
	goose.SetBaseFS(EmbedMigrations)
	migrations, err := goose.CollectMigrations(".", 0, math.MaxInt64)
	if err != nil {
		t.Fatalf("falha ao coletar migrações com goose: %v", err)
	}

	if len(migrations) < 3 {
		t.Fatalf("esperava ao menos 3 migrações, encontrou %d", len(migrations))
	}

	if migrations[0].Version != 1 {
		t.Errorf("esperava versão 1 na primeira migração, obteve %d", migrations[0].Version)
	}
	if migrations[1].Version != 2 {
		t.Errorf("esperava versão 2 na segunda migração, obteve %d", migrations[1].Version)
	}
	if migrations[2].Version != 3 {
		t.Errorf("esperava versão 3 na terceira migração, obteve %d", migrations[2].Version)
	}
}
