package item

import (
	"context"
	"testing"
	"time"

	entry "github.com/gildo-cordeiro/fin-plan/apps/api/internal/entry"
)

type mockRepo struct {
	items map[string]*Item
}

func newMockRepo() *mockRepo {
	return &mockRepo{items: make(map[string]*Item)}
}

func (m *mockRepo) Create(ctx context.Context, req CreateItemRequest) (*Item, error) {
	it := &Item{
		ID:        "item-1",
		BudgetID:  req.BudgetID,
		Name:      req.Name,
		Type:      ItemType(req.Type),
		CreatedAt: time.Now(),
		Entries:   make([]entry.Entry, 12),
	}
	for i := 1; i <= 12; i++ {
		it.Entries[i-1] = entry.Entry{
			ID:            "entry-" + string(rune('0'+i)),
			ItemID:        it.ID,
			Month:         i,
			PlannedAmount: 0,
		}
	}
	m.items[it.ID] = it
	return it, nil
}

func (m *mockRepo) GetByID(ctx context.Context, id string) (*Item, error) {
	it, ok := m.items[id]
	if !ok {
		return nil, ErrItemNotFound
	}
	return it, nil
}

func (m *mockRepo) GetByBudgetID(ctx context.Context, budgetID string) ([]Item, error) {
	res := make([]Item, 0)
	for _, it := range m.items {
		if it.BudgetID == budgetID {
			res = append(res, *it)
		}
	}
	return res, nil
}

func (m *mockRepo) Patch(ctx context.Context, id string, req PatchItemRequest) (*Item, error) {
	it, ok := m.items[id]
	if !ok {
		return nil, ErrItemNotFound
	}
	if req.Name != nil {
		it.Name = *req.Name
	}
	if req.Type != nil {
		it.Type = ItemType(*req.Type)
	}
	return it, nil
}

func (m *mockRepo) Delete(ctx context.Context, id string) error {
	if _, ok := m.items[id]; !ok {
		return ErrItemNotFound
	}
	delete(m.items, id)
	return nil
}

func TestItemService(t *testing.T) {
	repo := newMockRepo()
	svc := NewService(repo)
	ctx := context.Background()

	// Validação: tipo inválido
	_, err := svc.Create(ctx, CreateItemRequest{
		BudgetID: "2026",
		Name:     "Salário",
		Type:     "invalido",
	})
	if err == nil {
		t.Fatalf("esperava erro para tipo inválido")
	}

	// Sucesso
	it, err := svc.Create(ctx, CreateItemRequest{
		BudgetID: "2026",
		Name:     "Salário Principal",
		Type:     "renda",
	})
	if err != nil {
		t.Fatalf("falha ao criar item: %v", err)
	}

	if it.ID != "item-1" {
		t.Errorf("esperava id item-1, veio %s", it.ID)
	}
	if len(it.Entries) != 12 {
		t.Errorf("esperava 12 entries geradas, veio %d", len(it.Entries))
	}

	got, err := svc.GetByID(ctx, it.ID)
	if err != nil || got.Name != "Salário Principal" {
		t.Errorf("erro no get: %v", err)
	}

	newName := "Salário XPTO"
	updated, err := svc.Patch(ctx, it.ID, PatchItemRequest{
		Name: &newName,
	})
	if err != nil || updated.Name != newName {
		t.Errorf("erro no patch: %v", err)
	}

	if err := svc.Delete(ctx, it.ID); err != nil {
		t.Fatalf("erro no delete: %v", err)
	}

	_, err = svc.GetByID(ctx, it.ID)
	if err != ErrItemNotFound {
		t.Errorf("esperava ErrItemNotFound, veio %v", err)
	}
}
