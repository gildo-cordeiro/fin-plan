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
	_, err := NewCost(req.BudgetID, req.Name, req.DefaultMonth, req.MarginPercent, req.Notes)
	if err != nil {
		return nil, err
	}
	return s.repo.Create(ctx, req)
}

func (s *Service) Patch(ctx context.Context, id string, req PatchCostRequest) (*Cost, error) {
	if strings.TrimSpace(id) == "" {
		return nil, errors.New("id é obrigatório")
	}

	tempCost := &Cost{}
	err := tempCost.Update(req.Name, req.DefaultMonth, req.MarginPercent, req.Notes)
	if err != nil {
		return nil, err
	}

	return s.repo.Patch(ctx, id, req)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return errors.New("id é obrigatório")
	}
	return s.repo.Delete(ctx, id)
}
