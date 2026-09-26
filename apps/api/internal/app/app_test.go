package app

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/config"
)

func TestApp_New_WithoutMongo(t *testing.T) {
	cfg := &config.Config{
		Port: "8080",
	}

	application, err := New(context.Background(), cfg)
	if err != nil {
		t.Fatalf("esperava sucesso ao criar app sem mongo, obteve erro: %v", err)
	}

	if application == nil {
		t.Fatal("esperava application != nil")
	}

	if application.mongoClient != nil {
		t.Fatal("esperava mongoClient == nil")
	}
}

func TestApp_Routes_HealthCheck(t *testing.T) {
	cfg := &config.Config{Port: "8080"}
	application, err := New(context.Background(), cfg)
	if err != nil {
		t.Fatalf("erro ao instanciar app: %v", err)
	}

	mux := application.routes()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
	rec := httptest.NewRecorder()

	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("esperava status 200, obteve %d", rec.Code)
	}

	var body map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("falha ao decodificar JSON: %v", err)
	}

	if body["status"] != "ok" {
		t.Fatalf("esperava status=ok, obteve: %v", body["status"])
	}
}

func TestApp_Routes_Budget_UnavailableWhenNoDB(t *testing.T) {
	cfg := &config.Config{Port: "8080"}
	application, err := New(context.Background(), cfg)
	if err != nil {
		t.Fatalf("erro ao instanciar app: %v", err)
	}

	mux := application.routes()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/budget", nil)
	rec := httptest.NewRecorder()

	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("esperava status 503, obteve %d", rec.Code)
	}
}

func TestApp_Routes_MethodNotAllowed(t *testing.T) {
	cfg := &config.Config{Port: "8080"}
	application, err := New(context.Background(), cfg)
	if err != nil {
		t.Fatalf("erro ao instanciar app: %v", err)
	}

	mux := application.routes()

	req := httptest.NewRequest(http.MethodPatch, "/api/v1/budget", nil)
	rec := httptest.NewRecorder()

	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("esperava status 405, obteve %d", rec.Code)
	}
}
