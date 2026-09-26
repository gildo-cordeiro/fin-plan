package budget

import (
	"context"
	"errors"
)

type Service struct {
	repo BudgetRepository
}

func NewService(repo BudgetRepository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Get(ctx context.Context) (*BudgetState, error) {
	return s.repo.Get(ctx)
}

func (s *Service) Save(ctx context.Context, state *BudgetState) error {
	if state == nil {
		return errors.New("orçamento não pode ser nulo")
	}
	return s.repo.Save(ctx, state)
}
