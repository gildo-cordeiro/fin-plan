package budgetitem

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/httputil"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/v1/budget-items", h.Create)
	mux.HandleFunc("GET /api/v1/budget-items", h.List)
	mux.HandleFunc("GET /api/v1/budget-items/{id}", h.GetByID)
	mux.HandleFunc("PATCH /api/v1/budget-items/{id}", h.Update)
	mux.HandleFunc("DELETE /api/v1/budget-items/{id}", h.Delete)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var item BudgetItem
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "Corpo da requisição inválido ou ausente.")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	created, err := h.service.Create(ctx, &item)
	if err != nil {
		if errors.Is(err, ErrInvalidItemType) || errors.Is(err, ErrNameRequired) {
			httputil.WriteError(w, http.StatusBadRequest, err.Error())
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, "Erro interno ao criar item de orçamento.")
		return
	}

	httputil.WriteJSON(w, http.StatusCreated, created)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	itemType := r.URL.Query().Get("type")

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	items, err := h.service.List(ctx, itemType)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "Erro ao listar itens de orçamento.")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, items)
}

func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	item, err := h.service.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, ErrItemNotFound) {
			httputil.WriteError(w, http.StatusNotFound, "Item de orçamento não encontrado.")
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, "Erro ao buscar item de orçamento.")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, item)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var input UpdateBudgetItemInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "Corpo da requisição inválido ou ausente.")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	updated, err := h.service.Update(ctx, id, &input)
	if err != nil {
		if errors.Is(err, ErrItemNotFound) {
			httputil.WriteError(w, http.StatusNotFound, "Item de orçamento não encontrado.")
			return
		}
		if errors.Is(err, ErrInvalidItemType) || errors.Is(err, ErrNameRequired) {
			httputil.WriteError(w, http.StatusBadRequest, err.Error())
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, "Erro ao atualizar item de orçamento.")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, updated)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	if err := h.service.Delete(ctx, id); err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "Erro ao excluir item de orçamento.")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, httputil.SuccessResponse{
		Success: true,
		Message: "Item de orçamento excluído com sucesso.",
	})
}
