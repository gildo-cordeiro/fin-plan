package budget

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHandler_Get_NotFound(t *testing.T) {
	repo := &mockBudgetRepository{state: nil}
	svc := NewService(repo)
	h := NewHandler(svc)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/budget", nil)
	rec := httptest.NewRecorder()

	h.Get(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("esperava status 200, obteve %d", rec.Code)
	}

	var resp GetBudgetResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("falha ao decodificar JSON: %v", err)
	}

	if resp.Exists {
		t.Fatal("esperava exists=false")
	}
	if resp.Data != nil {
		t.Fatalf("esperava data=nil, obteve: %+v", resp.Data)
	}
}

func TestHandler_Get_Success(t *testing.T) {
	repo := &mockBudgetRepository{
		state: &BudgetState{
			Version: 5,
			Simulation: SimulationSettings{
				InitialBalance: 10000,
			},
		},
	}
	svc := NewService(repo)
	h := NewHandler(svc)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/budget", nil)
	rec := httptest.NewRecorder()

	h.Get(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("esperava status 200, obteve %d", rec.Code)
	}

	var resp GetBudgetResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("falha ao decodificar JSON: %v", err)
	}

	if !resp.Exists {
		t.Fatal("esperava exists=true")
	}
	if resp.Data == nil || resp.Data.Simulation.InitialBalance != 10000 {
		t.Fatalf("dados inesperados: %+v", resp.Data)
	}
}

func TestHandler_Get_InternalError(t *testing.T) {
	repo := &mockBudgetRepository{getErr: errors.New("timeout de conexão")}
	svc := NewService(repo)
	h := NewHandler(svc)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/budget", nil)
	rec := httptest.NewRecorder()

	h.Get(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("esperava status 500, obteve %d", rec.Code)
	}
}

func TestHandler_Save_InvalidBody(t *testing.T) {
	repo := &mockBudgetRepository{}
	svc := NewService(repo)
	h := NewHandler(svc)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/budget", bytes.NewBufferString("{invalid-json"))
	rec := httptest.NewRecorder()

	h.Save(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("esperava status 400, obteve %d", rec.Code)
	}
}

func TestHandler_Save_Success(t *testing.T) {
	repo := &mockBudgetRepository{}
	svc := NewService(repo)
	h := NewHandler(svc)

	payload := BudgetState{
		Version: 5,
		Simulation: SimulationSettings{
			InitialBalance: 15000,
		},
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/budget", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	h.Save(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("esperava status 200, obteve %d", rec.Code)
	}

	var resp PostBudgetResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("falha ao decodificar JSON: %v", err)
	}

	if !resp.Success {
		t.Fatal("esperava success=true")
	}
	if resp.UpdatedAt.IsZero() {
		t.Fatal("esperava updatedAt preenchido")
	}
}

func TestHandler_Save_InternalError(t *testing.T) {
	repo := &mockBudgetRepository{saveErr: errors.New("falha de gravação")}
	svc := NewService(repo)
	h := NewHandler(svc)

	payload := BudgetState{Version: 5}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/budget", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	h.Save(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("esperava status 500, obteve %d", rec.Code)
	}
}

func TestHandler_ServeHTTP_Routing(t *testing.T) {
	repo := &mockBudgetRepository{}
	svc := NewService(repo)
	h := NewHandler(svc)

	recOpt := httptest.NewRecorder()
	reqOpt := httptest.NewRequest(http.MethodOptions, "/api/v1/budget", nil)
	h.ServeHTTP(recOpt, reqOpt)
	if recOpt.Code != http.StatusOK {
		t.Fatalf("esperava status 200 para OPTIONS, obteve %d", recOpt.Code)
	}

	recDel := httptest.NewRecorder()
	reqDel := httptest.NewRequest(http.MethodDelete, "/api/v1/budget", nil)
	h.ServeHTTP(recDel, reqDel)
	if recDel.Code != http.StatusMethodNotAllowed {
		t.Fatalf("esperava status 405 para DELETE, obteve %d", recDel.Code)
	}
}

func TestHandler_MuxMethodRouting(t *testing.T) {
	repo := &mockBudgetRepository{state: &BudgetState{Version: 5}}
	svc := NewService(repo)
	h := NewHandler(svc)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/budget", h.Get)
	mux.HandleFunc("POST /api/v1/budget", h.Save)
	mux.HandleFunc("/api/v1/budget", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Método não suportado.",
		})
	})

	recGet := httptest.NewRecorder()
	reqGet := httptest.NewRequest(http.MethodGet, "/api/v1/budget", nil)
	mux.ServeHTTP(recGet, reqGet)
	if recGet.Code != http.StatusOK {
		t.Fatalf("GET via mux: esperava 200, obteve %d", recGet.Code)
	}

	body, _ := json.Marshal(BudgetState{Version: 5})
	recPost := httptest.NewRecorder()
	reqPost := httptest.NewRequest(http.MethodPost, "/api/v1/budget", bytes.NewReader(body))
	mux.ServeHTTP(recPost, reqPost)
	if recPost.Code != http.StatusOK {
		t.Fatalf("POST via mux: esperava 200, obteve %d", recPost.Code)
	}

	recPut := httptest.NewRecorder()
	reqPut := httptest.NewRequest(http.MethodPut, "/api/v1/budget", nil)
	mux.ServeHTTP(recPut, reqPut)
	if recPut.Code != http.StatusMethodNotAllowed {
		t.Fatalf("PUT via mux: esperava 405, obteve %d", recPut.Code)
	}
}
