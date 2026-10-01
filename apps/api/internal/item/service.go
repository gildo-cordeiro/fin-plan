package item

import (
	"context"
	"errors"
	"fmt"
	"strings"
)

var validTypes = map[string]bool{
	"renda":    true,
	"fixa":     true,
	"variavel": true,
	"cartao":   true,
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Create(ctx context.Context, req CreateItemRequest) (*Item, error) {
	if strings.TrimSpace(req.Name) == "" {
		return nil, errors.New("nome do item é obrigatório")
	}
	if strings.TrimSpace(req.BudgetID) == "" {
		return nil, errors.New("budgetId é obrigatório")
	}
	req.Type = strings.TrimSpace(strings.ToLower(req.Type))
	if !validTypes[req.Type] {
		return nil, fmt.Errorf("tipo '%s' inválido; deve ser renda, fixa, variavel ou cartao", req.Type)
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
	if req.Type != nil {
		t := strings.TrimSpace(strings.ToLower(*req.Type))
		if !validTypes[t] {
			return nil, fmt.Errorf("tipo '%s' inválido; deve ser renda, fixa, variavel ou cartao", t)
		}
		req.Type = &t
	}
	return s.repo.Patch(ctx, id, req)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return errors.New("id é obrigatório")
	}
	return s.repo.Delete(ctx, id)
}

