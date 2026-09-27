package costitem

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
	mux.HandleFunc("POST /api/v1/costs/{costId}/items", h.handleCreate)
	mux.HandleFunc("GET /api/v1/costs/{costId}/items", h.handleList)
	mux.HandleFunc("PATCH /api/v1/costs/{costId}/items/{id}", h.handlePatch)
	mux.HandleFunc("DELETE /api/v1/costs/{costId}/items/{id}", h.handleDelete)
}

func (h *Handler) handleCreate(w http.ResponseWriter, r *http.Request) {
	costID := r.PathValue("costId")
	if costID == "" {
		httputil.WriteError(w, http.StatusBadRequest, "costId é obrigatório")
		return
	}

	var req CreateCostItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "corpo da requisição inválido")
		return
	}

	created, err := h.svc.Create(r.Context(), costID, &req)
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusCreated, created)
}

func (h *Handler) handleList(w http.ResponseWriter, r *http.Request) {
	costID := r.PathValue("costId")
	if costID == "" {
		httputil.WriteError(w, http.StatusBadRequest, "costId é obrigatório")
		return
	}

	items, err := h.svc.GetByCostID(r.Context(), costID)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusOK, items)
}

func (h *Handler) handlePatch(w http.ResponseWriter, r *http.Request) {
	costID := r.PathValue("costId")
	id := r.PathValue("id")
	if costID == "" || id == "" {
		httputil.WriteError(w, http.StatusBadRequest, "costId e id do item são obrigatórios")
		return
	}

	var req PatchCostItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "corpo da requisição inválido")
		return
	}

	updated, err := h.svc.Update(r.Context(), costID, id, &req)
	if err != nil {
		if errors.Is(err, ErrCostItemNotFound) {
			httputil.WriteError(w, http.StatusNotFound, "item de custo não encontrado")
			return
		}
		httputil.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusOK, updated)
}

func (h *Handler) handleDelete(w http.ResponseWriter, r *http.Request) {
	costID := r.PathValue("costId")
	id := r.PathValue("id")
	if costID == "" || id == "" {
		httputil.WriteError(w, http.StatusBadRequest, "costId e id do item são obrigatórios")
		return
	}

	if err := h.svc.Delete(r.Context(), costID, id); err != nil {
		if errors.Is(err, ErrCostItemNotFound) {
			httputil.WriteError(w, http.StatusNotFound, "item de custo não encontrado")
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusOK, httputil.SuccessResponse{Success: true})
}
