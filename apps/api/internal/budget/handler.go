package budget

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

// Handler groups the HTTP handlers for the budget resource.
type Handler struct {
	repo *Repository
}

// NewHandler creates a Handler backed by the given Repository.
func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

// ServeHTTP dispatches to the correct handler method based on the HTTP method.
// It also handles OPTIONS (preflight) and unsupported methods.
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.handleGet(w, r)
	case http.MethodPost:
		h.handlePost(w, r)
	case http.MethodOptions:
		w.WriteHeader(http.StatusOK)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, ErrorResponse{
			Error: fmt.Sprintf("Método %s não suportado.", r.Method),
		})
	}
}

func (h *Handler) handleGet(w http.ResponseWriter, r *http.Request) {
	doc, err := h.repo.FindDefault(r.Context())
	if err != nil {
		log.Printf("[GET /api/v1/budget] Erro ao buscar documento: %v", err)
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{
			Error: err.Error(),
		})
		return
	}

	if doc == nil || doc.Data == nil {
		writeJSON(w, http.StatusOK, GetBudgetResponse{
			Exists: false,
			Data:   nil,
		})
		return
	}

	writeJSON(w, http.StatusOK, GetBudgetResponse{
		Exists:    true,
		Data:      doc.Data,
		UpdatedAt: doc.UpdatedAt,
	})
}

func (h *Handler) handlePost(w http.ResponseWriter, r *http.Request) {
	var body BudgetState
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{
			Error: "Corpo da requisição inválido ou ausente.",
		})
		return
	}

	updatedAt, err := h.repo.UpsertDefault(r.Context(), &body)
	if err != nil {
		log.Printf("[POST /api/v1/budget] Erro ao persistir: %v", err)
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{
			Error: "Erro interno do servidor",
		})
		return
	}

	writeJSON(w, http.StatusOK, PostBudgetResponse{
		Success:   true,
		Message:   "Orçamento persistido no MongoDB Atlas com sucesso.",
		UpdatedAt: updatedAt,
	})
}

// writeJSON serialises v as JSON and writes it with the given HTTP status code.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("[writeJSON] falha ao serializar resposta: %v", err)
	}
}
