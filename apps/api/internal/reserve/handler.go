package reserve

import (
	"encoding/json"
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
	mux.HandleFunc("POST /api/v1/reserve-movements", h.handleCreate)
	mux.HandleFunc("GET /api/v1/budgets/{year}/reserve-movements", h.handleGetByBudget)
}

func (h *Handler) handleCreate(w http.ResponseWriter, r *http.Request) {
	var req CreateReserveMovementRequest
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

func (h *Handler) handleGetByBudget(w http.ResponseWriter, r *http.Request) {
	year := r.PathValue("year")
	if year == "" {
		httputil.WriteError(w, http.StatusBadRequest, "ano do orçamento inválido")
		return
	}

	movements, err := h.svc.GetByBudgetID(r.Context(), year)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusOK, movements)
}
