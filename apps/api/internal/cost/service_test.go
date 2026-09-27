package cost

import (
	"context"
	"testing"
)

type mockRepo struct {
	costs map[string]*Cost
}

func newMockRepo() *mockRepo {
	return &mockRepo{costs: make(map[string]*Cost)}
}

func (m *mockRepo) Create(ctx context.Context, req CreateCostRequest) (*Cost, error) {
	c := &Cost{
		ID:            "cost-1",
		BudgetID:      req.BudgetID,
		Name:          req.Name,
		DefaultMonth:  req.DefaultMonth,
		MarginPercent: req.MarginPercent,
		Notes:         req.Notes,
	}
	m.costs[c.ID] = c
	return c, nil
}

func (m *mockRepo) GetByID(ctx context.Context, id string) (*Cost, error) {
	c, ok := m.costs[id]
	if !ok {
		return nil, ErrCostNotFound
	}
	return c, nil
}

func (m *mockRepo) GetByBudgetID(ctx context.Context, budgetID string) ([]Cost, error) {
	res := make([]Cost, 0)
	for _, c := range m.costs {
		if c.BudgetID == budgetID {
			res = append(res, *c)
		}
	}
	return res, nil
}

func (m *mockRepo) Patch(ctx context.Context, id string, req PatchCostRequest) (*Cost, error) {
	c, ok := m.costs[id]
	if !ok {
		return nil, ErrCostNotFound
	}
	if req.Name != nil {
		c.Name = *req.Name
	}
	if req.DefaultMonth != nil {
		c.DefaultMonth = req.DefaultMonth
	}
	if req.MarginPercent != nil {
		c.MarginPercent = *req.MarginPercent
	}
	if req.Notes != nil {
		c.Notes = req.Notes
	}
	return c, nil
}

func (m *mockRepo) Delete(ctx context.Context, id string) error {
	if _, ok := m.costs[id]; !ok {
		return ErrCostNotFound
	}
	delete(m.costs, id)
	return nil
}

func TestCostService(t *testing.T) {
	repo := newMockRepo()
	svc := NewService(repo)
	ctx := context.Background()

	m := 5
	notes := "Reforma"
	c, err := svc.Create(ctx, CreateCostRequest{
		BudgetID:      "2026",
		Name:          "Reforma Sala",
		DefaultMonth:  &m,
		MarginPercent: 10,
		Notes:         &notes,
	})
	if err != nil {
		t.Fatalf("falha ao criar custo: %v", err)
	}

	if c.ID != "cost-1" {
		t.Errorf("esperava id cost-1, obteve %s", c.ID)
	}

	got, err := svc.GetByID(ctx, c.ID)
	if err != nil || got.Name != "Reforma Sala" {
		t.Errorf("erro no get: %v", err)
	}

	newName := "Reforma Quarto"
	updated, err := svc.Patch(ctx, c.ID, PatchCostRequest{
		Name: &newName,
	})
	if err != nil || updated.Name != "Reforma Quarto" {
		t.Errorf("erro no patch: %v", err)
	}

	if err := svc.Delete(ctx, c.ID); err != nil {
		t.Fatalf("erro no delete: %v", err)
	}

	_, err = svc.GetByID(ctx, c.ID)
	if err != ErrCostNotFound {
		t.Errorf("esperava ErrCostNotFound, veio %v", err)
	}
}
