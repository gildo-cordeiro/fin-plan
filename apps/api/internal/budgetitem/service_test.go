package budgetitem

import (
	"context"
	"testing"
)

type mockRepo struct {
	items map[string]*BudgetItem
}

func newMockRepo() *mockRepo {
	return &mockRepo{items: make(map[string]*BudgetItem)}
}

func (m *mockRepo) Create(ctx context.Context, item *BudgetItem) error {
	m.items[item.ID] = item
	return nil
}

func (m *mockRepo) GetByID(ctx context.Context, id string) (*BudgetItem, error) {
	return m.items[id], nil
}

func (m *mockRepo) List(ctx context.Context, itemType string) ([]BudgetItem, error) {
	var res []BudgetItem
	for _, it := range m.items {
		if itemType == "" || it.Type == itemType {
			res = append(res, *it)
		}
	}
	return res, nil
}

func (m *mockRepo) Update(ctx context.Context, id string, input *UpdateBudgetItemInput) (*BudgetItem, error) {
	it := m.items[id]
	if it == nil {
		return nil, nil
	}
	if input.Name != nil {
		it.Name = *input.Name
	}
	if input.Type != nil {
		it.Type = *input.Type
	}
	if input.Off != nil {
		it.Off = input.Off
	}
	if input.Values != nil {
		if it.Values == nil {
			it.Values = make(map[string]float64)
		}
		for k, v := range input.Values {
			it.Values[k] = v
		}
	}
	return it, nil
}

func (m *mockRepo) Delete(ctx context.Context, id string) error {
	delete(m.items, id)
	return nil
}

func TestBudgetItemService_CreateAndGet(t *testing.T) {
	repo := newMockRepo()
	svc := NewService(repo)
	ctx := context.Background()

	item, err := svc.Create(ctx, &BudgetItem{
		Name: "Salário Principal",
		Type: "renda",
		Values: map[string]float64{
			"2026-10": 10000,
		},
	})
	if err != nil {
		t.Fatalf("falha ao criar item: %v", err)
	}

	if item.ID == "" {
		t.Errorf("esperava UUID gerado, veio vazio")
	}

	got, err := svc.GetByID(ctx, item.ID)
	if err != nil {
		t.Fatalf("falha ao buscar item: %v", err)
	}
	if got.Name != "Salário Principal" {
		t.Errorf("esperava 'Salário Principal', veio '%s'", got.Name)
	}
}

func TestBudgetItemService_Validation(t *testing.T) {
	repo := newMockRepo()
	svc := NewService(repo)
	ctx := context.Background()

	// Tipo inválido
	_, err := svc.Create(ctx, &BudgetItem{
		Name: "Investimento",
		Type: "tipo_invalido",
	})
	if err != ErrInvalidItemType {
		t.Errorf("esperava ErrInvalidItemType, recebeu %v", err)
	}

	// Nome vazio
	_, err = svc.Create(ctx, &BudgetItem{
		Name: "   ",
		Type: "fixa",
	})
	if err != ErrNameRequired {
		t.Errorf("esperava ErrNameRequired, recebeu %v", err)
	}
}

func TestBudgetItemService_UpdateAndDelete(t *testing.T) {
	repo := newMockRepo()
	svc := NewService(repo)
	ctx := context.Background()

	item, _ := svc.Create(ctx, &BudgetItem{
		Name: "Internet",
		Type: "fixa",
	})

	newName := "Internet Fibra 500M"
	updated, err := svc.Update(ctx, item.ID, &UpdateBudgetItemInput{
		Name: &newName,
		Values: map[string]float64{
			"2026-10": 120,
		},
	})
	if err != nil {
		t.Fatalf("falha ao atualizar: %v", err)
	}
	if updated.Name != newName {
		t.Errorf("esperava %s, veio %s", newName, updated.Name)
	}
	if updated.Values["2026-10"] != 120 {
		t.Errorf("esperava 120, veio %f", updated.Values["2026-10"])
	}

	if err := svc.Delete(ctx, item.ID); err != nil {
		t.Fatalf("falha ao deletar: %v", err)
	}

	_, err = svc.GetByID(ctx, item.ID)
	if err != ErrItemNotFound {
		t.Errorf("esperava ErrItemNotFound, veio %v", err)
	}
}
