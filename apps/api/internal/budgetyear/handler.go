package budgetyear

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
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
	mux.HandleFunc("POST /api/v1/budget-years", h.CreateYear)
	mux.HandleFunc("GET /api/v1/budget-years", h.ListYears)
	mux.HandleFunc("GET /api/v1/budget-years/{year}", h.GetYearViewModel)
	mux.HandleFunc("PATCH /api/v1/budget-years/{year}", h.UpdateSimulation)
	mux.HandleFunc("POST /api/v1/budget-years/{year}/months", h.AddMonth)
}

func (h *Handler) CreateYear(w http.ResponseWriter, r *http.Request) {
	var input CreateBudgetYearInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "Corpo da requisição inválido ou ausente.")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	created, err := h.service.CreateYear(ctx, &input)
	if err != nil {
		if errors.Is(err, ErrInvalidYear) {
			httputil.WriteError(w, http.StatusBadRequest, err.Error())
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, "Erro interno ao criar ano orçamentário.")
		return
	}

	httputil.WriteJSON(w, http.StatusCreated, created)
}

func (h *Handler) ListYears(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	years, err := h.service.ListYears(ctx)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "Erro ao listar anos orçamentários.")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, years)
}

func (h *Handler) GetYearViewModel(w http.ResponseWriter, r *http.Request) {
	yearStr := r.PathValue("year")
	year, err := strconv.Atoi(yearStr)
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "Ano inválido na URL.")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	vm, err := h.service.GetYearViewModel(ctx, year)
	if err != nil {
		if errors.Is(err, ErrInvalidYear) {
			httputil.WriteError(w, http.StatusBadRequest, err.Error())
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, "Erro ao carregar visão anual do orçamento.")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, vm)
}

func (h *Handler) UpdateSimulation(w http.ResponseWriter, r *http.Request) {
	yearStr := r.PathValue("year")
	year, err := strconv.Atoi(yearStr)
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "Ano inválido na URL.")
		return
	}

	var input UpdateSimulationInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "Corpo da requisição inválido ou ausente.")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	updated, err := h.service.UpdateSimulation(ctx, year, &input)
	if err != nil {
		if errors.Is(err, ErrYearNotFound) {
			httputil.WriteError(w, http.StatusNotFound, "Ano orçamentário não encontrado.")
			return
		}
		if errors.Is(err, ErrInvalidYear) {
			httputil.WriteError(w, http.StatusBadRequest, err.Error())
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, "Erro ao atualizar parâmetros de simulação.")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, updated)
}

func (h *Handler) AddMonth(w http.ResponseWriter, r *http.Request) {
	yearStr := r.PathValue("year")
	year, err := strconv.Atoi(yearStr)
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "Ano inválido na URL.")
		return
	}

	var input CreateMonthInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "Corpo da requisição inválido ou ausente.")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	m, err := h.service.AddMonth(ctx, year, &input)
	if err != nil {
		if errors.Is(err, ErrInvalidYear) {
			httputil.WriteError(w, http.StatusBadRequest, err.Error())
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, "Erro ao adicionar mês.")
		return
	}

	httputil.WriteJSON(w, http.StatusCreated, m)
}
