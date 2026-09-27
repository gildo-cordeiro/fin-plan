package entry

import (
	"context"
	"fmt"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetByID(ctx context.Context, id string) (*Entry, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) Update(ctx context.Context, id string, req *PatchEntryRequest) (*Entry, error) {
	if req.PlannedAmount != nil && *req.PlannedAmount < 0 {
		return nil, fmt.Errorf("plannedAmount não pode ser negativo")
	}
	if req.ActualAmount != nil && *req.ActualAmount < 0 {
		return nil, fmt.Errorf("actualAmount não pode ser negativo")
	}
	return s.repo.Update(ctx, id, req)
}
