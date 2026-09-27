package budget

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/httputil"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/budgets", h.handleGetAll)
	mux.HandleFunc("POST /api/v1/budgets", h.handleCreate)
	mux.HandleFunc("GET /api/v1/budgets/{year}", h.handleGetYearView)
	mux.HandleFunc("PATCH /api/v1/budgets/{year}", h.handlePatch)
	mux.HandleFunc("GET /api/v1/budgets/{year}/summary", h.handleGetSummary)
}

func (h *Handler) handleGetAll(w http.ResponseWriter, r *http.Request) {
	budgets, err := h.svc.GetAll(r.Context())
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, budgets)
}

func (h *Handler) handleCreate(w http.ResponseWriter, r *http.Request) {
	var req CreateBudgetRequest
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

func (h *Handler) handleGetYearView(w http.ResponseWriter, r *http.Request) {
	yearStr := r.PathValue("year")
	year, err := strconv.Atoi(yearStr)
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "ano inválido")
		return
	}

	res, err := h.svc.GetYearViewModel(r.Context(), year)
	if err != nil {
		if errors.Is(err, ErrBudgetNotFound) {
			httputil.WriteError(w, http.StatusNotFound, err.Error())
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusOK, res)
}

func (h *Handler) handlePatch(w http.ResponseWriter, r *http.Request) {
	yearStr := r.PathValue("year")
	year, err := strconv.Atoi(yearStr)
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "ano inválido")
		return
	}

	var req PatchBudgetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "corpo da requisição inválido")
		return
	}

	updated, err := h.svc.Patch(r.Context(), year, req)
	if err != nil {
		if errors.Is(err, ErrBudgetNotFound) {
			httputil.WriteError(w, http.StatusNotFound, err.Error())
			return
		}
		httputil.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusOK, updated)
}

func (h *Handler) handleGetSummary(w http.ResponseWriter, r *http.Request) {
	yearStr := r.PathValue("year")
	year, err := strconv.Atoi(yearStr)
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "ano inválido")
		return
	}

	summary, err := h.svc.GetSummary(r.Context(), year)
	if err != nil {
		if errors.Is(err, ErrBudgetNotFound) {
			httputil.WriteError(w, http.StatusNotFound, err.Error())
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusOK, summary)
}
