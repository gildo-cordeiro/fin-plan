package reserve

import (
	"context"
	"testing"
)

type mockRepo struct {
	movements []ReserveMovement
}

func (m *mockRepo) Create(ctx context.Context, req CreateReserveMovementRequest) (*ReserveMovement, error) {
	rm := ReserveMovement{
		ID:       "mv-1",
		BudgetID: req.BudgetID,
		Month:    req.Month,
		Amount:   req.Amount,
		Reason:   req.Reason,
	}
	m.movements = append(m.movements, rm)
	return &rm, nil
}

func (m *mockRepo) GetByBudgetID(ctx context.Context, budgetID string) ([]ReserveMovement, error) {
	res := make([]ReserveMovement, 0)
	for _, mv := range m.movements {
		if mv.BudgetID == budgetID {
			res = append(res, mv)
		}
	}
	return res, nil
}

func TestReserveService(t *testing.T) {
	repo := &mockRepo{movements: make([]ReserveMovement, 0)}
	svc := NewService(repo)
	ctx := context.Background()

	// Validação de mês inválido
	_, err := svc.Create(ctx, CreateReserveMovementRequest{
		BudgetID: "2026",
		Month:    13,
		Amount:   500,
	})
	if err == nil {
		t.Fatalf("esperava erro para mês 13")
	}

	// Validação de montante 0
	_, err = svc.Create(ctx, CreateReserveMovementRequest{
		BudgetID: "2026",
		Month:    2,
		Amount:   0,
	})
	if err == nil {
		t.Fatalf("esperava erro para montante 0")
	}

	// Criação válida
	reason := "Aporte emergencial"
	created, err := svc.Create(ctx, CreateReserveMovementRequest{
		BudgetID: "2026",
		Month:    5,
		Amount:   1500,
		Reason:   &reason,
	})
	if err != nil {
		t.Fatalf("falha ao criar movimento: %v", err)
	}
	if created.Amount != 1500 {
		t.Errorf("esperava 1500, veio %f", created.Amount)
	}

	list, err := svc.GetByBudgetID(ctx, "2026")
	if err != nil || len(list) != 1 {
		t.Fatalf("esperava 1 movimento listado")
	}
}
