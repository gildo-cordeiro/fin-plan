package budget

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	state, err := h.service.Get(ctx)
	if err != nil {
		log.Printf("[GET /api/v1/budget] Erro ao buscar documento: %v", err)
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{
			Error: err.Error(),
		})
		return
	}

	if state == nil {
		writeJSON(w, http.StatusOK, GetBudgetResponse{
			Exists: false,
			Data:   nil,
		})
		return
	}

	writeJSON(w, http.StatusOK, GetBudgetResponse{
		Exists: true,
		Data:   state,
	})
}

func (h *Handler) Save(w http.ResponseWriter, r *http.Request) {
	var body BudgetState
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{
			Error: "Corpo da requisição inválido ou ausente.",
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	if err := h.service.Save(ctx, &body); err != nil {
		log.Printf("[POST /api/v1/budget] Erro ao persistir: %v", err)
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{
			Error: "Erro interno do servidor",
		})
		return
	}

	writeJSON(w, http.StatusOK, PostBudgetResponse{
		Success:   true,
		Message:   "Orçamento persistido no MongoDB Atlas com sucesso.",
		UpdatedAt: time.Now().UTC(),
	})
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/budget", h.Get)
	mux.HandleFunc("POST /api/v1/budget", h.Save)
	mux.HandleFunc("/api/v1/budget", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusMethodNotAllowed, ErrorResponse{
			Error: fmt.Sprintf("Método %s não suportado.", r.Method),
		})
	})
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.Get(w, r)
	case http.MethodPost:
		h.Save(w, r)
	case http.MethodOptions:
		w.WriteHeader(http.StatusOK)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, ErrorResponse{
			Error: fmt.Sprintf("Método %s não suportado.", r.Method),
		})
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("[writeJSON] falha ao serializar resposta: %v", err)
	}
}
