package entry

import (
	"context"
	"testing"
)

type mockRepo struct {
	entries map[string]*Entry
}

func newMockRepo() *mockRepo {
	return &mockRepo{entries: make(map[string]*Entry)}
}

func (m *mockRepo) CreateBatch(ctx context.Context, entries []Entry) error {
	for _, e := range entries {
		m.entries[e.ID] = &e
	}
	return nil
}

func (m *mockRepo) GetByID(ctx context.Context, id string) (*Entry, error) {
	e, ok := m.entries[id]
	if !ok {
		return nil, ErrEntryNotFound
	}
	return e, nil
}

func (m *mockRepo) GetByItemID(ctx context.Context, itemID string) ([]Entry, error) {
	var res []Entry
	for _, e := range m.entries {
		if e.ItemID == itemID {
			res = append(res, *e)
		}
	}
	return res, nil
}

func (m *mockRepo) Update(ctx context.Context, id string, req *PatchEntryRequest) (*Entry, error) {
	e, ok := m.entries[id]
	if !ok {
		return nil, ErrEntryNotFound
	}
	if req.PlannedAmount != nil {
		e.PlannedAmount = *req.PlannedAmount
	}
	if req.DueDate != nil {
		e.DueDate = req.DueDate
	}
	return e, nil
}

func (m *mockRepo) Confirm(ctx context.Context, id string, req *ConfirmEntryRequest) (*Entry, error) {
	e, ok := m.entries[id]
	if !ok {
		return nil, ErrEntryNotFound
	}
	if req.ActualAmount != nil {
		e.ActualAmount = req.ActualAmount
	}
	if req.PaidDate != nil {
		e.PaidDate = req.PaidDate
	}
	return e, nil
}

func (m *mockRepo) Unconfirm(ctx context.Context, id string) (*Entry, error) {
	e, ok := m.entries[id]
	if !ok {
		return nil, ErrEntryNotFound
	}
	e.ActualAmount = nil
	e.PaidDate = nil
	return e, nil
}

func TestEntryService(t *testing.T) {
	repo := newMockRepo()
	e := &Entry{
		ID:            "entry-1",
		ItemID:        "item-1",
		Month:         1,
		PlannedAmount: 1000.0,
	}
	repo.entries[e.ID] = e

	svc := NewService(repo)
	ctx := context.Background()

	got, err := svc.GetByID(ctx, "entry-1")
	if err != nil || got.PlannedAmount != 1000.0 {
		t.Errorf("erro no get: %v", err)
	}

	newPlanned := 1200.0
	updated, err := svc.Update(ctx, "entry-1", &PatchEntryRequest{
		PlannedAmount: &newPlanned,
	})
	if err != nil || updated.PlannedAmount != 1200.0 {
		t.Errorf("erro no patch: %v", err)
	}

	actual := 1150.0
	paidDate := "2026-01-05"
	confirmed, err := svc.Confirm(ctx, "entry-1", &ConfirmEntryRequest{
		ActualAmount: &actual,
		PaidDate:     &paidDate,
	})
	if err != nil || *confirmed.ActualAmount != 1150.0 {
		t.Errorf("erro no confirm: %v", err)
	}

	cleared, err := svc.Unconfirm(ctx, "entry-1")
	if err != nil || cleared.ActualAmount != nil || cleared.PaidDate != nil {
		t.Errorf("erro no clear: %v", err)
	}

	_, err = svc.GetByID(ctx, "invalido")
	if err != ErrEntryNotFound {
		t.Errorf("esperava ErrEntryNotFound, veio %v", err)
	}
}
