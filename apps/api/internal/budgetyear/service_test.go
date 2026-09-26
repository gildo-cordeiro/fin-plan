package budgetyear

import (
	"context"
	"fmt"
	"testing"
)

type mockRepo struct {
	years  map[int]*BudgetYear
	months map[string]*Month
}

func newMockRepo() *mockRepo {
	return &mockRepo{
		years:  make(map[int]*BudgetYear),
		months: make(map[string]*Month),
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

func (m *mockRepo) CreateMonth(ctx context.Context, month *Month) error {
	m.months[month.ID] = month
	return nil
}

func (m *mockRepo) ListMonthsByYear(ctx context.Context, year int) ([]Month, error) {
	yearID := fmt.Sprintf("%d", year)
	var res []Month
	for _, mo := range m.months {
		if mo.BudgetYearID == yearID {
			res = append(res, *mo)
		}
	}
	return res, nil
}

func (m *mockRepo) GetYearViewModel(ctx context.Context, year int) (*YearViewModel, error) {
	y := m.years[year]
	if y == nil {
		return nil, nil
	}
	months, _ := m.ListMonthsByYear(ctx, year)
	return &YearViewModel{
		Year:   *y,
		Months: months,
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

	// 12 meses devem ter sido populados no mock
	months, _ := repo.ListMonthsByYear(ctx, 2026)
	if len(months) != 12 {
		t.Errorf("esperava 12 meses, vieram %d", len(months))
	}

	// Atualizar simulação do ano
	newVars := 10.0
	updated, err := svc.UpdateSimulation(ctx, 2026, &UpdateSimulationInput{
		VarsPercent: &newVars,
	})
	if err != nil || updated.Simulation.VarsPercent != 10.0 {
		t.Errorf("falha ao atualizar simulação: %v", err)
	}

	// Buscar YearViewModel
	vm, err := svc.GetYearViewModel(ctx, 2026)
	if err != nil || vm == nil {
		t.Fatalf("falha ao buscar view model: %v", err)
	}
	if len(vm.Months) != 12 {
		t.Errorf("esperava 12 meses na view model, vieram %d", len(vm.Months))
	}
}
