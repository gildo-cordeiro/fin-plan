package item

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

func (s *Service) Create(ctx context.Context, req CreateItemRequest) (*Item, error) {
	_, err := NewItem(req.BudgetID, req.Name, req.Type)
	if err != nil {
		return nil, err
	}
	return s.repo.Create(ctx, req)
}

func (s *Service) GetByID(ctx context.Context, id string) (*Item, error) {
	if strings.TrimSpace(id) == "" {
		return nil, errors.New("id é obrigatório")
	}
	return s.repo.GetByID(ctx, id)
}

func (s *Service) GetByBudgetID(ctx context.Context, budgetID string) ([]Item, error) {
	if strings.TrimSpace(budgetID) == "" {
		return nil, errors.New("budgetId é obrigatório")
	}
	return s.repo.GetByBudgetID(ctx, budgetID)
}

func (s *Service) Patch(ctx context.Context, id string, req PatchItemRequest) (*Item, error) {
	if strings.TrimSpace(id) == "" {
		return nil, errors.New("id é obrigatório")
	}

	tempItem := &Item{}
	err := tempItem.Update(req.Name, req.Type, req.Off)
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
