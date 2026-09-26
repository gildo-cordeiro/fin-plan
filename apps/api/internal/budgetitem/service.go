package budgetitem

import (
	"context"
	"errors"
	"strings"

	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/httputil"
)

var (
	ErrItemNotFound    = errors.New("item de orçamento não encontrado")
	ErrInvalidItemType = errors.New("tipo de item inválido. Esperado: renda, cartao, fixa ou var")
	ErrNameRequired    = errors.New("o nome do item é obrigatório")
)

var validTypes = map[string]bool{
	"renda":  true,
	"cartao": true,
	"fixa":   true,
	"var":    true,
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Create(ctx context.Context, item *BudgetItem) (*BudgetItem, error) {
	if item == nil {
		return nil, errors.New("dados do item não informados")
	}

	item.Name = strings.TrimSpace(item.Name)
	if item.Name == "" {
		return nil, ErrNameRequired
	}

	item.Type = strings.TrimSpace(item.Type)
	if !validTypes[item.Type] {
		return nil, ErrInvalidItemType
	}

	if item.ID == "" {
		item.ID = httputil.GenerateUUID()
	}

	if item.Values == nil {
		item.Values = make(map[string]float64)
	}

	if err := s.repo.Create(ctx, item); err != nil {
		return nil, err
	}

	return item, nil
}

func (s *Service) GetByID(ctx context.Context, id string) (*BudgetItem, error) {
	if strings.TrimSpace(id) == "" {
		return nil, errors.New("id é obrigatório")
	}
	item, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if item == nil {
		return nil, ErrItemNotFound
	}
	return item, nil
}

func (s *Service) List(ctx context.Context, itemType string) ([]BudgetItem, error) {
	return s.repo.List(ctx, itemType)
}

func (s *Service) Update(ctx context.Context, id string, input *UpdateBudgetItemInput) (*BudgetItem, error) {
	if strings.TrimSpace(id) == "" {
		return nil, errors.New("id é obrigatório")
	}
	if input == nil {
		return nil, errors.New("dados para atualização não informados")
	}

	if input.Type != nil {
		trimmedType := strings.TrimSpace(*input.Type)
		if !validTypes[trimmedType] {
			return nil, ErrInvalidItemType
		}
		input.Type = &trimmedType
	}

	if input.Name != nil {
		trimmedName := strings.TrimSpace(*input.Name)
		if trimmedName == "" {
			return nil, ErrNameRequired
		}
		input.Name = &trimmedName
	}

	updated, err := s.repo.Update(ctx, id, input)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, ErrItemNotFound
	}
	return updated, nil
}

func (s *Service) Delete(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return errors.New("id é obrigatório")
	}
	return s.repo.Delete(ctx, id)
}
