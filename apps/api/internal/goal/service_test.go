package goal

import (
	"context"
	"testing"
)

type mockRepo struct {
	items map[string]*Goal
}

func newMockRepo() *mockRepo {
	return &mockRepo{items: make(map[string]*Goal)}
}

func (m *mockRepo) Create(ctx context.Context, g *Goal) error {
	m.items[g.ID] = g
	return nil
}

func (m *mockRepo) GetByID(ctx context.Context, id string) (*Goal, error) {
	return m.items[id], nil
}

func (m *mockRepo) List(ctx context.Context, status string) ([]Goal, error) {
	var res []Goal
	for _, it := range m.items {
		if status == "" || it.Status == status {
			res = append(res, *it)
		}
	}
	return res, nil
}

func (m *mockRepo) Update(ctx context.Context, id string, input *UpdateGoalInput) (*Goal, error) {
	g := m.items[id]
	if g == nil {
		return nil, nil
	}
	if input.Name != nil {
		g.Name = *input.Name
	}
	if input.Status != nil {
		g.Status = *input.Status
	}
	return g, nil
}

func (m *mockRepo) Delete(ctx context.Context, id string) error {
	delete(m.items, id)
	return nil
}

func (m *mockRepo) AddContribution(ctx context.Context, goalID string, contribution *GoalContribution) (*Goal, error) {
	g := m.items[goalID]
	if g == nil {
		return nil, nil
	}
	g.Contributions = append(g.Contributions, *contribution)
	return g, nil
}

func (m *mockRepo) DeleteContribution(ctx context.Context, goalID string, contributionID string) (*Goal, error) {
	g := m.items[goalID]
	if g == nil {
		return nil, nil
	}
	var filtered []GoalContribution
	for _, c := range g.Contributions {
		if c.ID != contributionID {
			filtered = append(filtered, c)
		}
	}
	g.Contributions = filtered
	return g, nil
}

func TestGoalService(t *testing.T) {
	repo := newMockRepo()
	svc := NewService(repo)
	ctx := context.Background()

	g, err := svc.Create(ctx, &Goal{
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
	updated, err := svc.AddContribution(ctx, g.ID, &AddContributionInput{
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
