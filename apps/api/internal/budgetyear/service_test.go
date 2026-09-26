package budgetyear

import (
	"context"
	"testing"
)

type mockRepo struct {
	years map[int]*BudgetYear
}

func newMockRepo() *mockRepo {
	return &mockRepo{
		years: make(map[int]*BudgetYear),
	}
}

func (m *mockRepo) CreateYear(ctx context.Context, y *BudgetYear) error {
	m.years[y.Year] = y
	return nil
}

func (m *mockRepo) GetYearByYear(ctx context.Context, year int) (*BudgetYear, error) {
	return m.years[year], nil
}

func (m *mockRepo) ListYears(ctx context.Context) ([]BudgetYear, error) {
	var res []BudgetYear
	for _, y := range m.years {
		res = append(res, *y)
	}
	return res, nil
}

func (m *mockRepo) UpdateSimulation(ctx context.Context, year int, input *UpdateSimulationInput) (*BudgetYear, error) {
	y := m.years[year]
	if y == nil {
		return nil, nil
	}
	if input.VarsPercent != nil {
		y.Simulation.VarsPercent = *input.VarsPercent
	}
	if input.RendaPercent != nil {
		y.Simulation.RendaPercent = *input.RendaPercent
	}
	return y, nil
}

func (m *mockRepo) AddMonthToYear(ctx context.Context, year int, month *Month) error {
	y := m.years[year]
	if y == nil {
		return ErrYearNotFound
	}
	for i, existing := range y.Months {
		if existing.ID == month.ID {
			y.Months[i] = *month
			return nil
		}
	}
	y.Months = append(y.Months, *month)
	return nil
}

func (m *mockRepo) GetYearViewModel(ctx context.Context, year int) (*YearViewModel, error) {
	y := m.years[year]
	if y == nil {
		return nil, nil
	}
	return &YearViewModel{
		Year:   *y,
		Months: y.Months,
	}, nil
}

func TestBudgetYearService(t *testing.T) {
	repo := newMockRepo()
	svc := NewService(repo)
	ctx := context.Background()

	// Criar ano 2026
	y, err := svc.CreateYear(ctx, &CreateBudgetYearInput{
		Year: 2026,
		Simulation: &SimulationSettings{
			InitialBalance:   15000,
			EmergencyReserve: 10000,
		},
	})
	if err != nil {
		t.Fatalf("falha ao criar ano: %v", err)
	}
	if y.Year != 2026 {
		t.Errorf("esperava ano 2026, veio %d", y.Year)
	}

	// 12 meses devem ter sido embutidos no ano
	if len(y.Months) != 12 {
		t.Errorf("esperava 12 meses embutidos, vieram %d", len(y.Months))
	}
	if y.Months[0].ID != "2026-01" {
		t.Errorf("esperava primeiro mês 2026-01, veio %s", y.Months[0].ID)
	}

	// Atualizar simulação do ano
	newVars := 10.0
	updated, err := svc.UpdateSimulation(ctx, 2026, &UpdateSimulationInput{
		VarsPercent: &newVars,
	})
	if err != nil || updated.Simulation.VarsPercent != 10.0 {
		t.Errorf("falha ao atualizar simulação: %v", err)
	}

	// Adicionar um mês extra ao ano
	newMonth, err := svc.AddMonth(ctx, 2026, &CreateMonthInput{
		ID:         "2026-13",
		Name:       "Décimo Terceiro 2026",
		ShortName:  "13º/26",
		MonthIndex: 12,
	})
	if err != nil {
		t.Fatalf("falha ao adicionar mês: %v", err)
	}
	if newMonth.ID != "2026-13" {
		t.Errorf("esperava ID 2026-13, veio %s", newMonth.ID)
	}

	// Buscar YearViewModel
	vm, err := svc.GetYearViewModel(ctx, 2026)
	if err != nil || vm == nil {
		t.Fatalf("falha ao buscar view model: %v", err)
	}
	if len(vm.Months) != 13 {
		t.Errorf("esperava 13 meses na view model após adicionar mês, vieram %d", len(vm.Months))
	}

	// Testar validação de ano inválido
	_, err = svc.CreateYear(ctx, &CreateBudgetYearInput{Year: 1800})
	if err != ErrInvalidYear {
		t.Errorf("esperava ErrInvalidYear, veio %v", err)
	}

	// Testar adicionar mês a ano inexistente
	_, err = svc.AddMonth(ctx, 2099, &CreateMonthInput{Name: "Jan 2099"})
	if err != ErrYearNotFound {
		t.Errorf("esperava ErrYearNotFound, veio %v", err)
	}
}
