package onetimecost

import (
	"context"
	"testing"
)

type mockRepo struct {
	items map[string]*OneTimeCost
}

func newMockRepo() *mockRepo {
	return &mockRepo{items: make(map[string]*OneTimeCost)}
}

func (m *mockRepo) Create(ctx context.Context, item *OneTimeCost) error {
	m.items[item.ID] = item
	return nil
}

func (m *mockRepo) GetByID(ctx context.Context, id string) (*OneTimeCost, error) {
	return m.items[id], nil
}

func (m *mockRepo) List(ctx context.Context, targetMonthId string) ([]OneTimeCost, error) {
	var res []OneTimeCost
	for _, it := range m.items {
		if targetMonthId == "" || (it.TargetMonthID != nil && *it.TargetMonthID == targetMonthId) {
			res = append(res, *it)
		}
	}
	return res, nil
}

func (m *mockRepo) Update(ctx context.Context, id string, input *UpdateOneTimeCostInput) (*OneTimeCost, error) {
	it := m.items[id]
	if it == nil {
		return nil, nil
	}
	if input.Name != nil {
		it.Name = *input.Name
	}
	if input.Value != nil {
		it.Value = *input.Value
	}
	if input.ClearTargetMonthID {
		it.TargetMonthID = nil
	} else if input.TargetMonthID != nil {
		it.TargetMonthID = input.TargetMonthID
	}
	if input.Off != nil {
		it.Off = input.Off
	}
	return it, nil
}

func (m *mockRepo) Delete(ctx context.Context, id string) error {
	delete(m.items, id)
	return nil
}

func TestOneTimeCostService(t *testing.T) {
	repo := newMockRepo()
	svc := NewService(repo)
	ctx := context.Background()

	targetM := "2026-11"
	cost, err := svc.Create(ctx, &OneTimeCost{
		Name:          "Reforma Sala",
		Value:         3500,
		TargetMonthID: &targetM,
	})
	if err != nil {
		t.Fatalf("falha ao criar custo: %v", err)
	}

	if cost.ID == "" {
		t.Errorf("esperava id gerado")
	}

	got, err := svc.GetByID(ctx, cost.ID)
	if err != nil || got.Value != 3500 {
		t.Errorf("erro no get: %v", err)
	}

	newVal := 4000.0
	updated, err := svc.Update(ctx, cost.ID, &UpdateOneTimeCostInput{
		Value: &newVal,
	})
	if err != nil || updated.Value != 4000 {
		t.Errorf("erro no update: %v", err)
	}

	if err := svc.Delete(ctx, cost.ID); err != nil {
		t.Fatalf("erro no delete: %v", err)
	}

	_, err = svc.GetByID(ctx, cost.ID)
	if err != ErrCostNotFound {
		t.Errorf("esperava ErrCostNotFound, veio %v", err)
	}
}
