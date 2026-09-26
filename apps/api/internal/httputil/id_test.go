package httputil_test

import (
	"testing"

	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/httputil"
	"github.com/google/uuid"
)

func TestGenerateUUID(t *testing.T) {
	id := httputil.GenerateUUID()
	if id == "" {
		t.Fatal("esperava uuid não vazio")
	}

	parsed, err := uuid.Parse(id)
	if err != nil {
		t.Fatalf("erro ao analisar uuid gerado: %v", err)
	}

	if parsed.Version() != 4 {
		t.Fatalf("esperava uuid v4, obteve v%d", parsed.Version())
	}

	if !httputil.IsValidUUID(id) {
		t.Fatal("esperava IsValidUUID == true")
	}

	if httputil.IsValidUUID("invalido-uuid-123") {
		t.Fatal("esperava IsValidUUID == false para formato inválido")
	}
}
