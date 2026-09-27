package goal

import (
	"context"
	"errors"
	"fmt"
	"strings"
)

var validStatuses = map[string]bool{
	"ativa":     true,
	"concluida": true,
	"pausada":   true,
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Create(ctx context.Context, req CreateGoalRequest) (*Goal, error) {
	if strings.TrimSpace(req.Name) == "" {
		return nil, errors.New("nome da meta é obrigatório")
	}
	if req.TargetAmount <= 0 {
		return nil, errors.New("targetAmount deve ser maior que zero")
	}
	if req.Status != nil && *req.Status != "" {
		st := strings.TrimSpace(strings.ToLower(*req.Status))
		if !validStatuses[st] {
			return nil, fmt.Errorf("status '%s' inválido; deve ser ativa, concluida ou pausada", st)
		}
		req.Status = &st
	}

	return s.repo.Create(ctx, req)
}

func (s *Service) GetByID(ctx context.Context, id string) (*Goal, error) {
	if strings.TrimSpace(id) == "" {
		return nil, errors.New("id é obrigatório")
	}
	return s.repo.GetByID(ctx, id)
}

func (s *Service) GetAll(ctx context.Context) ([]Goal, error) {
	return s.repo.GetAll(ctx)
}

func (s *Service) Patch(ctx context.Context, id string, req PatchGoalRequest) (*Goal, error) {
	if strings.TrimSpace(id) == "" {
		return nil, errors.New("id é obrigatório")
	}
	if req.TargetAmount != nil && *req.TargetAmount <= 0 {
		return nil, errors.New("targetAmount deve ser maior que zero")
	}
	if req.Status != nil && *req.Status != "" {
		st := strings.TrimSpace(strings.ToLower(*req.Status))
		if !validStatuses[st] {
			return nil, fmt.Errorf("status '%s' inválido; deve ser ativa, concluida ou pausada", st)
		}
		req.Status = &st
	}
	return s.repo.Patch(ctx, id, req)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return errors.New("id é obrigatório")
	}
	return s.repo.Delete(ctx, id)
}

func (s *Service) AddContribution(ctx context.Context, goalID string, req CreateContributionRequest) (*Goal, error) {
	if strings.TrimSpace(goalID) == "" {
		return nil, errors.New("goalId é obrigatório")
	}
	if strings.TrimSpace(req.Date) == "" {
		return nil, errors.New("data da contribuição é obrigatória")
	}
	if req.Amount <= 0 {
		return nil, errors.New("valor da contribuição deve ser maior que zero")
	}

	return s.repo.AddContribution(ctx, goalID, req)
}

func (s *Service) DeleteContribution(ctx context.Context, goalID string, contributionID string) (*Goal, error) {
	if strings.TrimSpace(goalID) == "" || strings.TrimSpace(contributionID) == "" {
		return nil, errors.New("goalId e contributionId são obrigatórios")
	}
	return s.repo.DeleteContribution(ctx, goalID, contributionID)
}
