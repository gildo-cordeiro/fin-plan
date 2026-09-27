package costitem

import (
	"context"
	"fmt"
	"strings"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Create(ctx context.Context, costID string, req *CreateCostItemRequest) (*CostItem, error) {
	if strings.TrimSpace(req.Name) == "" {
		return nil, fmt.Errorf("o nome do item é obrigatório")
	}
	if req.PlannedAmount < 0 {
		return nil, fmt.Errorf("o valor planejado não pode ser negativo")
	}
	if req.Month != nil && (*req.Month < 1 || *req.Month > 12) {
		return nil, fmt.Errorf("mês deve ser entre 1 e 12")
	}
	return s.repo.Create(ctx, costID, req)
}

func (s *Service) GetByID(ctx context.Context, id string) (*CostItem, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) GetByCostID(ctx context.Context, costID string) ([]CostItem, error) {
	return s.repo.GetByCostID(ctx, costID)
}

func (s *Service) Update(ctx context.Context, costID, id string, req *PatchCostItemRequest) (*CostItem, error) {
	if req.Name != nil && strings.TrimSpace(*req.Name) == "" {
		return nil, fmt.Errorf("o nome do item não pode ser vazio")
	}
	if req.PlannedAmount != nil && *req.PlannedAmount < 0 {
		return nil, fmt.Errorf("o valor planejado não pode ser negativo")
	}
	if req.Month != nil && (*req.Month < 1 || *req.Month > 12) {
		return nil, fmt.Errorf("mês deve ser entre 1 e 12")
	}
	return s.repo.Update(ctx, costID, id, req)
}

func (s *Service) Delete(ctx context.Context, costID, id string) error {
	return s.repo.Delete(ctx, costID, id)
}
