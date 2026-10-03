package entry

import (
	"context"
	"fmt"

	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/httputil"
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
	return s.repo.Update(ctx, id, req)
}

func (s *Service) Confirm(ctx context.Context, id string, req *ConfirmEntryRequest) (*Entry, error) {
	if req.ActualAmount != nil && *req.ActualAmount < 0 {
		return nil, fmt.Errorf("actualAmount não pode ser negativo")
	}
	if req.PaidDate != nil && !httputil.IsValidDate(*req.PaidDate) {
		return nil, fmt.Errorf("paidDate deve estar no formato YYYY-MM-DD")
	}
	return s.repo.Confirm(ctx, id, req)
}

func (s *Service) Unconfirm(ctx context.Context, id string) (*Entry, error) {
	return s.repo.Unconfirm(ctx, id)
}
