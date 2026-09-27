package budget

import (
	"context"
	"testing"
	"time"
)

type mockBudgetRepo struct {
	budgets map[int]*Budget
}

func newMockBudgetRepo() *mockBudgetRepo {
	return &mockBudgetRepo{
		budgets: make(map[int]*Budget),
	}
}

func (m *mockBudgetRepo) GetAll(ctx context.Context) ([]Budget, error) {
	res := make([]Budget, 0)
	for _, b := range m.budgets {
		res = append(res, *b)
	}
	return res, nil
}

func (m *mockBudgetRepo) GetByYear(ctx context.Context, year int) (*Budget, error) {
	b, ok := m.budgets[year]
	if !ok {
		return nil, ErrBudgetNotFound
	}
	return b, nil
}

func (m *mockBudgetRepo) Create(ctx context.Context, req CreateBudgetRequest) (*Budget, error) {
	initBal := 0.0
	if req.InitialBalance != nil {
		initBal = *req.InitialBalance
	}
	resTarget := 0.0
	if req.EmergencyReserveTarget != nil {
		resTarget = *req.EmergencyReserveTarget
	}

	b := &Budget{
		ID:                     string(rune(req.Year)),
		Year:                   req.Year,
		InitialBalance:         initBal,
		EmergencyReserveTarget: resTarget,
		ReconciledMonth:        req.ReconciledMonth,
		ReconciledBalance:      req.ReconciledBalance,
		CreatedAt:              time.Now(),
		UpdatedAt:              time.Now(),
	}
	m.budgets[req.Year] = b
	return b, nil
}

func (m *mockBudgetRepo) Patch(ctx context.Context, year int, req PatchBudgetRequest) (*Budget, error) {
	b, ok := m.budgets[year]
	if !ok {
		return nil, ErrBudgetNotFound
	}
	if req.InitialBalance != nil {
		b.InitialBalance = *req.InitialBalance
	}
	if req.EmergencyReserveTarget != nil {
		b.EmergencyReserveTarget = *req.EmergencyReserveTarget
	}
	if req.ReconciledMonth != nil {
		b.ReconciledMonth = req.ReconciledMonth
	}
	if req.ReconciledBalance != nil {
		b.ReconciledBalance = req.ReconciledBalance
	}
	b.UpdatedAt = time.Now()
	return b, nil
}

func (m *mockBudgetRepo) GetSummary(ctx context.Context, year int) (*BudgetSummary, error) {
	b, ok := m.budgets[year]
	if !ok {
		return nil, ErrBudgetNotFound
	}
	return &BudgetSummary{
		Year:                   year,
		InitialBalance:         b.InitialBalance,
		EmergencyReserveTarget: b.EmergencyReserveTarget,
		ReconciledMonth:        b.ReconciledMonth,
		ReconciledBalance:      b.ReconciledBalance,
		Months:                 make([]BudgetSummaryMonth, 12),
	}, nil
}

func TestBudgetService(t *testing.T) {
	repo := newMockBudgetRepo()
	svc := NewService(repo, nil, nil, nil, nil)
	ctx := context.Background()

	// Validação de ano
	_, err := svc.Create(ctx, CreateBudgetRequest{Year: 1800})
	if err == nil {
		t.Fatalf("esperava erro para ano 1800")
	}

	// Validação de mês conciliado
	invalidMonth := 13
	_, err = svc.Create(ctx, CreateBudgetRequest{Year: 2026, ReconciledMonth: &invalidMonth})
	if err == nil {
		t.Fatalf("esperava erro para mês conciliado 13")
	}

	// Criar orçamento 2026
	initBal := 15000.0
	resTarget := 10000.0
	b, err := svc.Create(ctx, CreateBudgetRequest{
		Year:                   2026,
		InitialBalance:         &initBal,
		EmergencyReserveTarget: &resTarget,
	})
	if err != nil {
		t.Fatalf("falha ao criar orçamento: %v", err)
	}
	if b.Year != 2026 {
		t.Errorf("esperava ano 2026, veio %d", b.Year)
	}

	// Atualizar orçamento com conciliação
	newInit := 20000.0
	recMonth := 9
	recBal := 18500.0
	updated, err := svc.Patch(ctx, 2026, PatchBudgetRequest{
		InitialBalance:    &newInit,
		ReconciledMonth:   &recMonth,
		ReconciledBalance: &recBal,
	})
	if err != nil || updated.InitialBalance != 20000 {
		t.Errorf("falha ao atualizar orçamento: %v", err)
	}
	if updated.ReconciledMonth == nil || *updated.ReconciledMonth != 9 {
		t.Errorf("esperava ReconciledMonth = 9, veio %v", updated.ReconciledMonth)
	}
	if updated.ReconciledBalance == nil || *updated.ReconciledBalance != 18500.0 {
		t.Errorf("esperava ReconciledBalance = 18500.0, veio %v", updated.ReconciledBalance)
	}

	// Buscar YearViewModel
	vm, err := svc.GetYearViewModel(ctx, 2026)
	if err != nil || vm == nil {
		t.Fatalf("falha ao buscar view model: %v", err)
	}
	if vm.Budget.Year != 2026 {
		t.Errorf("esperava ano 2026 na view model, veio %d", vm.Budget.Year)
	}

	// Buscar Summary
	summary, err := svc.GetSummary(ctx, 2026)
	if err != nil || summary.Year != 2026 {
		t.Fatalf("falha ao buscar summary: %v", err)
	}
	if summary.ReconciledMonth == nil || *summary.ReconciledMonth != 9 {
		t.Errorf("esperava summary com ReconciledMonth = 9, veio %v", summary.ReconciledMonth)
	}
}
