package goal

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
	mux.HandleFunc("POST /api/v1/goals", h.Create)
	mux.HandleFunc("GET /api/v1/goals", h.List)
	mux.HandleFunc("GET /api/v1/goals/{id}", h.GetByID)
	mux.HandleFunc("PATCH /api/v1/goals/{id}", h.Update)
	mux.HandleFunc("DELETE /api/v1/goals/{id}", h.Delete)
	mux.HandleFunc("POST /api/v1/goals/{id}/contributions", h.AddContribution)
	mux.HandleFunc("DELETE /api/v1/goals/{id}/contributions/{contributionId}", h.DeleteContribution)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var g Goal
	if err := json.NewDecoder(r.Body).Decode(&g); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "Corpo da requisição inválido ou ausente.")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	created, err := h.service.Create(ctx, &g)
	if err != nil {
		if errors.Is(err, ErrNameRequired) || errors.Is(err, ErrInvalidStatus) {
			httputil.WriteError(w, http.StatusBadRequest, err.Error())
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, "Erro interno ao criar meta financeira.")
		return
	}

	httputil.WriteJSON(w, http.StatusCreated, created)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	items, err := h.service.List(ctx, status)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "Erro ao listar metas financeiras.")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, items)
}

func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	g, err := h.service.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, ErrGoalNotFound) {
			httputil.WriteError(w, http.StatusNotFound, "Meta financeira não encontrada.")
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, "Erro ao buscar meta financeira.")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, g)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var input UpdateGoalInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "Corpo da requisição inválido ou ausente.")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	updated, err := h.service.Update(ctx, id, &input)
	if err != nil {
		if errors.Is(err, ErrGoalNotFound) {
			httputil.WriteError(w, http.StatusNotFound, "Meta financeira não encontrada.")
			return
		}
		if errors.Is(err, ErrNameRequired) || errors.Is(err, ErrInvalidStatus) {
			httputil.WriteError(w, http.StatusBadRequest, err.Error())
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, "Erro ao atualizar meta financeira.")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, updated)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	if err := h.service.Delete(ctx, id); err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "Erro ao excluir meta financeira.")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, httputil.SuccessResponse{
		Success: true,
		Message: "Meta financeira excluída com sucesso.",
	})
}

func (h *Handler) AddContribution(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var input AddContributionInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "Corpo da requisição inválido ou ausente.")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	updated, err := h.service.AddContribution(ctx, id, &input)
	if err != nil {
		if errors.Is(err, ErrGoalNotFound) {
			httputil.WriteError(w, http.StatusNotFound, "Meta financeira não encontrada.")
			return
		}
		if errors.Is(err, ErrInvalidAmount) {
			httputil.WriteError(w, http.StatusBadRequest, err.Error())
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, "Erro ao adicionar contribuição.")
		return
	}

	httputil.WriteJSON(w, http.StatusCreated, updated)
}

func (h *Handler) DeleteContribution(w http.ResponseWriter, r *http.Request) {
	goalID := r.PathValue("id")
	contribID := r.PathValue("contributionId")

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	updated, err := h.service.DeleteContribution(ctx, goalID, contribID)
	if err != nil {
		if errors.Is(err, ErrGoalNotFound) {
			httputil.WriteError(w, http.StatusNotFound, "Meta financeira não encontrada.")
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, "Erro ao remover contribuição.")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, updated)
}
