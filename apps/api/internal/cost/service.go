package cost

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

func (s *Service) GetByID(ctx context.Context, id string) (*Cost, error) {
	if strings.TrimSpace(id) == "" {
		return nil, errors.New("id é obrigatório")
	}
	return s.repo.GetByID(ctx, id)
}

func (s *Service) GetByBudgetID(ctx context.Context, budgetID string) ([]Cost, error) {
	if strings.TrimSpace(budgetID) == "" {
		return nil, errors.New("budgetId é obrigatório")
	}
	return s.repo.GetByBudgetID(ctx, budgetID)
}

func (s *Service) Create(ctx context.Context, req CreateCostRequest) (*Cost, error) {
	if strings.TrimSpace(req.Name) == "" {
		return nil, errors.New("nome do custo é obrigatório")
	}
	if strings.TrimSpace(req.BudgetID) == "" {
		return nil, errors.New("budgetId é obrigatório")
	}
	if req.DefaultMonth != nil && (*req.DefaultMonth < 1 || *req.DefaultMonth > 12) {
		return nil, errors.New("defaultMonth deve estar entre 1 e 12")
	}
	return s.repo.Create(ctx, req)
}

func (s *Service) Patch(ctx context.Context, id string, req PatchCostRequest) (*Cost, error) {
	if strings.TrimSpace(id) == "" {
		return nil, errors.New("id é obrigatório")
	}
	if req.DefaultMonth != nil && (*req.DefaultMonth < 1 || *req.DefaultMonth > 12) {
		return nil, errors.New("defaultMonth deve estar entre 1 e 12")
	}
	return s.repo.Patch(ctx, id, req)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return errors.New("id é obrigatório")
	}
	return s.repo.Delete(ctx, id)
}

