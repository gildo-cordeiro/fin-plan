package costitem

import (
	"context"
	"testing"
)

type mockRepo struct {
	items map[string]*CostItem
}

func newMockRepo() *mockRepo {
	return &mockRepo{items: make(map[string]*CostItem)}
}

func (m *mockRepo) Create(ctx context.Context, costID string, req *CreateCostItemRequest) (*CostItem, error) {
	ci := &CostItem{
		ID:            "ci-1",
		CostID:        costID,
		Name:          req.Name,
		PlannedAmount: req.PlannedAmount,
		ActualAmount:  req.ActualAmount,
		Month:         req.Month,
		DueDate:       req.DueDate,
		PaidDate:      req.PaidDate,
	}
	m.items[ci.ID] = ci
	return ci, nil
}

func (m *mockRepo) GetByID(ctx context.Context, id string) (*CostItem, error) {
	ci, ok := m.items[id]
	if !ok {
		return nil, ErrCostItemNotFound
	}
	return ci, nil
}

func (m *mockRepo) GetByCostID(ctx context.Context, costID string) ([]CostItem, error) {
	var res []CostItem
	for _, ci := range m.items {
		if ci.CostID == costID {
			res = append(res, *ci)
		}
	}
	return res, nil
}

func (m *mockRepo) Update(ctx context.Context, costID, id string, req *PatchCostItemRequest) (*CostItem, error) {
	ci, ok := m.items[id]
	if !ok {
		return nil, ErrCostItemNotFound
	}
	if req.Name != nil {
		ci.Name = *req.Name
	}
	if req.PlannedAmount != nil {
		ci.PlannedAmount = *req.PlannedAmount
	}
	if req.Month != nil {
		ci.Month = req.Month
	}
	if req.DueDate != nil {
		ci.DueDate = req.DueDate
	}
	return ci, nil
}

func (m *mockRepo) Confirm(ctx context.Context, costID, id string, req *ConfirmCostItemRequest) (*CostItem, error) {
	ci, ok := m.items[id]
	if !ok {
		return nil, ErrCostItemNotFound
	}
	if req.ActualAmount != nil {
		ci.ActualAmount = req.ActualAmount
	}
	if req.PaidDate != nil {
		ci.PaidDate = req.PaidDate
	}
	return ci, nil
}

func (m *mockRepo) Unconfirm(ctx context.Context, costID, id string) (*CostItem, error) {
	ci, ok := m.items[id]
	if !ok {
		return nil, ErrCostItemNotFound
	}
	ci.ActualAmount = nil
	ci.PaidDate = nil
	return ci, nil
}

func (m *mockRepo) Delete(ctx context.Context, costID, id string) error {
	if _, ok := m.items[id]; !ok {
		return ErrCostItemNotFound
	}
	delete(m.items, id)
	return nil
}

func TestCostItemService(t *testing.T) {
	repo := newMockRepo()
	svc := NewService(repo)
	ctx := context.Background()

	m := 5
	dueDate := "2026-05-10"
	ci, err := svc.Create(ctx, "cost-1", &CreateCostItemRequest{
		Name:          "Item 1",
		PlannedAmount: 100.0,
		Month:         &m,
		DueDate:       &dueDate,
	})
	if err != nil {
		t.Fatalf("falha ao criar cost item: %v", err)
	}

	if ci.ID != "ci-1" {
		t.Errorf("esperava id ci-1, obteve %s", ci.ID)
	}

	got, err := svc.GetByID(ctx, ci.ID)
	if err != nil || got.Name != "Item 1" {
		t.Errorf("erro no get: %v", err)
	}

	newName := "Item Modificado"
	updated, err := svc.Update(ctx, "cost-1", ci.ID, &PatchCostItemRequest{
		Name: &newName,
	})
	if err != nil || updated.Name != "Item Modificado" {
		t.Errorf("erro no patch: %v", err)
	}

	actual := 95.0
	paidDate := "2026-05-09"
	confirmed, err := svc.Confirm(ctx, "cost-1", ci.ID, &ConfirmCostItemRequest{
		ActualAmount: &actual,
		PaidDate:     &paidDate,
	})
	if err != nil || *confirmed.ActualAmount != 95.0 {
		t.Errorf("erro no confirm: %v", err)
	}

	if err := svc.Delete(ctx, "cost-1", ci.ID); err != nil {
		t.Fatalf("erro no delete: %v", err)
	}

	_, err = svc.GetByID(ctx, ci.ID)
	if err != ErrCostItemNotFound {
		t.Errorf("esperava ErrCostItemNotFound, veio %v", err)
	}
}
