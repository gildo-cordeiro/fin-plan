package reserve

import (
	"context"
	"errors"
	"strings"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Create(ctx context.Context, req CreateReserveMovementRequest) (*ReserveMovement, error) {
	if strings.TrimSpace(req.BudgetID) == "" {
		return nil, errors.New("budgetId é obrigatório")
	}
	if req.Month < 1 || req.Month > 12 {
		return nil, errors.New("month deve estar entre 1 e 12")
	}
	if req.Amount == 0 {
		return nil, errors.New("amount não pode ser zero")
	}

	return s.repo.Create(ctx, req)
}

func (s *Service) GetByBudgetID(ctx context.Context, budgetID string) ([]ReserveMovement, error) {
	if strings.TrimSpace(budgetID) == "" {
		return nil, errors.New("budgetId é obrigatório")
	}
	return s.repo.GetByBudgetID(ctx, budgetID)
}
