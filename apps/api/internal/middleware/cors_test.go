package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/middleware"
)

func TestCORS_Preflight_AllowsPatchAndDelete(t *testing.T) {
	handler := middleware.CORS()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodOptions, "/api/v1/budget-years/2026", nil)
	req.Header.Set("Origin", "https://web-zeta-ten-62.vercel.app")
	req.Header.Set("Access-Control-Request-Method", "PATCH")

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("esperava status 200 para OPTIONS, obteve %d", rec.Code)
	}

	allowMethods := rec.Header().Get("Access-Control-Allow-Methods")
	if !strings.Contains(allowMethods, "PATCH") {
		t.Fatalf("esperava PATCH em Access-Control-Allow-Methods, obteve %s", allowMethods)
	}
	if !strings.Contains(allowMethods, "DELETE") {
		t.Fatalf("esperava DELETE em Access-Control-Allow-Methods, obteve %s", allowMethods)
	}

	allowOrigin := rec.Header().Get("Access-Control-Allow-Origin")
	if allowOrigin != "https://web-zeta-ten-62.vercel.app" {
		t.Fatalf("esperava Access-Control-Allow-Origin refletindo origin, obteve %s", allowOrigin)
	}
}

func TestCORS_NonOptions_PassesThrough(t *testing.T) {
	called := false
	handler := middleware.CORS()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusAccepted)
	}))

	req := httptest.NewRequest(http.MethodPatch, "/api/v1/budget-years/2026", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if !called {
		t.Fatal("esperava que o next handler fosse chamado para requisição não-OPTIONS")
	}
	if rec.Code != http.StatusAccepted {
		t.Fatalf("esperava status 202, obteve %d", rec.Code)
	}
}
