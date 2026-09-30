package goal

import (
	"context"
	"testing"
)

type mockRepo struct {
	goals map[string]*Goal
}

func newMockRepo() *mockRepo {
	return &mockRepo{goals: make(map[string]*Goal)}
}

func (m *mockRepo) Create(ctx context.Context, req CreateGoalRequest) (*Goal, error) {
	status := "ativa"
	if req.Status != nil && *req.Status != "" {
		status = *req.Status
	}
	g := &Goal{
		ID:            "goal-1",
		Name:          req.Name,
		Description:   req.Description,
		TargetAmount:  req.TargetAmount,
		Color:         req.Color,
		Status:        status,
		Contributions: make([]GoalContribution, 0),
	}
	m.goals[g.ID] = g
	return g, nil
}

func (m *mockRepo) GetByID(ctx context.Context, id string) (*Goal, error) {
	g, ok := m.goals[id]
	if !ok {
		return nil, ErrGoalNotFound
	}
	return g, nil
}

func (m *mockRepo) GetAll(ctx context.Context) ([]Goal, error) {
	res := make([]Goal, 0)
	for _, g := range m.goals {
		res = append(res, *g)
	}
	return res, nil
}

func (m *mockRepo) Patch(ctx context.Context, id string, req PatchGoalRequest) (*Goal, error) {
	g, ok := m.goals[id]
	if !ok {
		return nil, ErrGoalNotFound
	}
	if req.Name != nil {
		g.Name = *req.Name
	}
	if req.Description != nil {
		g.Description = req.Description
	}
	if req.TargetAmount != nil {
		g.TargetAmount = *req.TargetAmount
	}
	if req.Status != nil {
		g.Status = *req.Status
	}
	return g, nil
}

func (m *mockRepo) Delete(ctx context.Context, id string) error {
	if _, ok := m.goals[id]; !ok {
		return ErrGoalNotFound
	}
	delete(m.goals, id)
	return nil
}

func (m *mockRepo) AddContribution(ctx context.Context, goalID string, req CreateContributionRequest) (*Goal, error) {
	g, ok := m.goals[goalID]
	if !ok {
		return nil, ErrGoalNotFound
	}
	g.Contributions = append(g.Contributions, GoalContribution{
		ID:     "c-1",
		GoalID: goalID,
		Date:   req.Date,
		Amount: req.Amount,
		Note:   req.Note,
	})
	return g, nil
}

func (m *mockRepo) DeleteContribution(ctx context.Context, goalID string, contributionID string) (*Goal, error) {
	g, ok := m.goals[goalID]
	if !ok {
		return nil, ErrGoalNotFound
	}
	filtered := make([]GoalContribution, 0)
	found := false
	for _, c := range g.Contributions {
		if c.ID == contributionID {
			found = true
		} else {
			filtered = append(filtered, c)
		}
	}
	if !found {
		return nil, ErrContributionNotFound
	}
	g.Contributions = filtered
	return g, nil
}

func TestGoalService(t *testing.T) {
	repo := newMockRepo()
	svc := NewService(repo)
	ctx := context.Background()

	// Validação de targetAmount <= 0
	_, err := svc.Create(ctx, CreateGoalRequest{
		Name:         "Reserva",
		TargetAmount: 0,
	})
	if err == nil {
		t.Fatalf("esperava erro para targetAmount 0")
	}

	// Criar meta válida
	g, err := svc.Create(ctx, CreateGoalRequest{
		Name:         "Reserva de Emergência",
		TargetAmount: 50000,
	})
	if err != nil {
		t.Fatalf("falha ao criar meta: %v", err)
	}

	if g.Status != "ativa" {
		t.Errorf("esperava status padrão ativa, veio %s", g.Status)
	}

	// Adicionar contribuição
	updated, err := svc.AddContribution(ctx, g.ID, CreateContributionRequest{
		Amount: 2500,
		Date:   "2026-10-01",
	})
	if err != nil {
		t.Fatalf("falha ao adicionar aporte: %v", err)
	}
	if len(updated.Contributions) != 1 {
		t.Fatalf("esperava 1 contribuição, vieram %d", len(updated.Contributions))
	}
	contribID := updated.Contributions[0].ID

	// Deletar contribuição
	afterDelete, err := svc.DeleteContribution(ctx, g.ID, contribID)
	if err != nil {
		t.Fatalf("falha ao deletar aporte: %v", err)
	}
	if len(afterDelete.Contributions) != 0 {
		t.Errorf("esperava 0 contribuições, vieram %d", len(afterDelete.Contributions))
	}
}
