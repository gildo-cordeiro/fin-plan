package onetimecost

import (
	"context"
	"errors"
	"strings"

	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/httputil"
)

var (
	ErrCostNotFound = errors.New("custo pontual não encontrado")
	ErrNameRequired = errors.New("o nome do custo pontual é obrigatório")
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Create(ctx context.Context, item *OneTimeCost) (*OneTimeCost, error) {
	if item == nil {
		return nil, errors.New("dados do custo pontual não informados")
	}

	item.Name = strings.TrimSpace(item.Name)
	if item.Name == "" {
		return nil, ErrNameRequired
	}

	if item.ID == "" {
		item.ID = httputil.GenerateUUID()
	}

	if err := s.repo.Create(ctx, item); err != nil {
		return nil, err
	}

	return item, nil
}

func (s *Service) GetByID(ctx context.Context, id string) (*OneTimeCost, error) {
	if strings.TrimSpace(id) == "" {
		return nil, errors.New("id é obrigatório")
	}
	item, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if item == nil {
		return nil, ErrCostNotFound
	}
	return item, nil
}

func (s *Service) List(ctx context.Context, targetMonthId string) ([]OneTimeCost, error) {
	return s.repo.List(ctx, targetMonthId)
}

func (s *Service) Update(ctx context.Context, id string, input *UpdateOneTimeCostInput) (*OneTimeCost, error) {
	if strings.TrimSpace(id) == "" {
		return nil, errors.New("id é obrigatório")
	}
	if input == nil {
		return nil, errors.New("dados para atualização não informados")
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
		return nil, ErrCostNotFound
	}
	return updated, nil
}

func (s *Service) Delete(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return errors.New("id é obrigatório")
	}
	return s.repo.Delete(ctx, id)
}
