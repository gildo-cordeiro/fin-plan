package goal

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/httputil"
)

var (
	ErrGoalNotFound         = errors.New("meta financeira não encontrada")
	ErrNameRequired         = errors.New("o nome da meta é obrigatório")
	ErrInvalidAmount        = errors.New("o valor da contribuição deve ser maior que zero")
	ErrInvalidStatus        = errors.New("status inválido. Esperado: ativa, concluida ou pausada")
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

func (s *Service) Create(ctx context.Context, g *Goal) (*Goal, error) {
	if g == nil {
		return nil, errors.New("dados da meta não informados")
	}

	g.Name = strings.TrimSpace(g.Name)
	if g.Name == "" {
		return nil, ErrNameRequired
	}

	g.Status = strings.TrimSpace(g.Status)
	if g.Status == "" {
		g.Status = "ativa"
	} else if !validStatuses[g.Status] {
		return nil, ErrInvalidStatus
	}

	if g.ID == "" {
		g.ID = httputil.GenerateUUID()
	}

	if g.Contributions == nil {
		g.Contributions = []GoalContribution{}
	}

	if err := s.repo.Create(ctx, g); err != nil {
		return nil, err
	}

	return g, nil
}

func (s *Service) GetByID(ctx context.Context, id string) (*Goal, error) {
	if strings.TrimSpace(id) == "" {
		return nil, errors.New("id é obrigatório")
	}
	g, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if g == nil {
		return nil, ErrGoalNotFound
	}
	return g, nil
}

func (s *Service) List(ctx context.Context, status string) ([]Goal, error) {
	return s.repo.List(ctx, status)
}

func (s *Service) Update(ctx context.Context, id string, input *UpdateGoalInput) (*Goal, error) {
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

	if input.Status != nil {
		trimmedStatus := strings.TrimSpace(*input.Status)
		if !validStatuses[trimmedStatus] {
			return nil, ErrInvalidStatus
		}
		input.Status = &trimmedStatus
	}

	updated, err := s.repo.Update(ctx, id, input)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, ErrGoalNotFound
	}
	return updated, nil
}

func (s *Service) Delete(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return errors.New("id é obrigatório")
	}
	return s.repo.Delete(ctx, id)
}

func (s *Service) AddContribution(ctx context.Context, goalID string, input *AddContributionInput) (*Goal, error) {
	if strings.TrimSpace(goalID) == "" {
		return nil, errors.New("goalId é obrigatório")
	}
	if input == nil {
		return nil, errors.New("dados da contribuição não informados")
	}
	if input.Amount <= 0 {
		return nil, ErrInvalidAmount
	}

	date := strings.TrimSpace(input.Date)
	if date == "" {
		date = time.Now().UTC().Format("2006-01-02")
	}

	contrib := &GoalContribution{
		ID:     httputil.GenerateUUID(),
		Date:   date,
		Amount: input.Amount,
		Note:   input.Note,
	}

	updated, err := s.repo.AddContribution(ctx, goalID, contrib)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, ErrGoalNotFound
	}
	return updated, nil
}

func (s *Service) DeleteContribution(ctx context.Context, goalID string, contributionID string) (*Goal, error) {
	if strings.TrimSpace(goalID) == "" {
		return nil, errors.New("goalId é obrigatório")
	}
	if strings.TrimSpace(contributionID) == "" {
		return nil, errors.New("contributionId é obrigatório")
	}

	updated, err := s.repo.DeleteContribution(ctx, goalID, contributionID)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, ErrGoalNotFound
	}
	return updated, nil
}
