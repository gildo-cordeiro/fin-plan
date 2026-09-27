package entry

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
	mux.HandleFunc("PATCH /api/v1/entries/{id}", h.handlePatch)
}

func (h *Handler) handlePatch(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		httputil.WriteError(w, http.StatusBadRequest, "id da entry é obrigatório")
		return
	}

	var req PatchEntryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "corpo da requisição inválido")
		return
	}

	updated, err := h.svc.Update(r.Context(), id, &req)
	if err != nil {
		if errors.Is(err, ErrEntryNotFound) {
			httputil.WriteError(w, http.StatusNotFound, "lançamento não encontrado")
			return
		}
		httputil.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusOK, updated)
}
