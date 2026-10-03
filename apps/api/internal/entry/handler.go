package entry

import (
	"encoding/json"
	"errors"
	"io"
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
	mux.HandleFunc("POST /api/v1/entries/{id}/confirm", h.handleConfirm)
	mux.HandleFunc("DELETE /api/v1/entries/{id}/confirm", h.handleUnconfirm)
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
	h.writeResult(w, updated, err)
}

func (h *Handler) handleConfirm(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		httputil.WriteError(w, http.StatusBadRequest, "id da entry é obrigatório")
		return
	}

	var req ConfirmEntryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil && !errors.Is(err, io.EOF) {
		httputil.WriteError(w, http.StatusBadRequest, "corpo da requisição inválido")
		return
	}

	updated, err := h.svc.Confirm(r.Context(), id, &req)
	h.writeResult(w, updated, err)
}

func (h *Handler) handleUnconfirm(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		httputil.WriteError(w, http.StatusBadRequest, "id da entry é obrigatório")
		return
	}

	updated, err := h.svc.Unconfirm(r.Context(), id)
	h.writeResult(w, updated, err)
}

func (h *Handler) writeResult(w http.ResponseWriter, e *Entry, err error) {
	if err != nil {
		if errors.Is(err, ErrEntryNotFound) {
			httputil.WriteError(w, http.StatusNotFound, "lançamento não encontrado")
			return
		}
		httputil.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, e)
}
