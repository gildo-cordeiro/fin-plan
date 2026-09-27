package goal

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/httputil"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/v1/goals", h.handleCreate)
	mux.HandleFunc("GET /api/v1/goals", h.handleGetAll)
	mux.HandleFunc("GET /api/v1/goals/{id}", h.handleGetByID)
	mux.HandleFunc("PATCH /api/v1/goals/{id}", h.handlePatch)
	mux.HandleFunc("DELETE /api/v1/goals/{id}", h.handleDelete)
	mux.HandleFunc("POST /api/v1/goals/{goalId}/contributions", h.handleAddContribution)
	mux.HandleFunc("DELETE /api/v1/goals/{goalId}/contributions/{contributionId}", h.handleDeleteContribution)
}

func (h *Handler) handleCreate(w http.ResponseWriter, r *http.Request) {
	var req CreateGoalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "corpo da requisição inválido")
		return
	}

	created, err := h.svc.Create(r.Context(), req)
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusCreated, created)
}

func (h *Handler) handleGetAll(w http.ResponseWriter, r *http.Request) {
	goals, err := h.svc.GetAll(r.Context())
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusOK, goals)
}

func (h *Handler) handleGetByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		httputil.WriteError(w, http.StatusBadRequest, "id inválido")
		return
	}

	res, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, ErrGoalNotFound) {
			httputil.WriteError(w, http.StatusNotFound, err.Error())
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusOK, res)
}

func (h *Handler) handlePatch(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		httputil.WriteError(w, http.StatusBadRequest, "id inválido")
		return
	}

	var req PatchGoalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "corpo da requisição inválido")
		return
	}

	updated, err := h.svc.Patch(r.Context(), id, req)
	if err != nil {
		if errors.Is(err, ErrGoalNotFound) {
			httputil.WriteError(w, http.StatusNotFound, err.Error())
			return
		}
		httputil.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusOK, updated)
}

func (h *Handler) handleDelete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		httputil.WriteError(w, http.StatusBadRequest, "id inválido")
		return
	}

	if err := h.svc.Delete(r.Context(), id); err != nil {
		if errors.Is(err, ErrGoalNotFound) {
			httputil.WriteError(w, http.StatusNotFound, err.Error())
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusOK, httputil.SuccessResponse{Success: true})
}

func (h *Handler) handleAddContribution(w http.ResponseWriter, r *http.Request) {
	goalID := r.PathValue("goalId")
	if goalID == "" {
		httputil.WriteError(w, http.StatusBadRequest, "goalId inválido")
		return
	}

	var req CreateContributionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "corpo da requisição inválido")
		return
	}

	updatedGoal, err := h.svc.AddContribution(r.Context(), goalID, req)
	if err != nil {
		if errors.Is(err, ErrGoalNotFound) {
			httputil.WriteError(w, http.StatusNotFound, err.Error())
			return
		}
		httputil.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusOK, updatedGoal)
}

func (h *Handler) handleDeleteContribution(w http.ResponseWriter, r *http.Request) {
	goalID := r.PathValue("goalId")
	contributionID := r.PathValue("contributionId")
	if goalID == "" || contributionID == "" {
		httputil.WriteError(w, http.StatusBadRequest, "parâmetros inválidos")
		return
	}

	updatedGoal, err := h.svc.DeleteContribution(r.Context(), goalID, contributionID)
	if err != nil {
		if errors.Is(err, ErrGoalNotFound) || errors.Is(err, ErrContributionNotFound) {
			httputil.WriteError(w, http.StatusNotFound, err.Error())
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusOK, updatedGoal)
}
