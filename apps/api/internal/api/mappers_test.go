package api

import (
	"testing"

	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/budget"
)

func TestMapBudgetSummary(t *testing.T) {
	in := budget.BudgetSummary{
		Year:                   2026,
		InitialBalance:         12000.50,
		EmergencyReserveTarget: 30000.00,
		Months: []budget.BudgetSummaryMonth{
			{
				Month:              10,
				Income:             8166.24,
				Cards:              5509.20,
				Fixed:              1000.00,
				Variable:           784.80,
				OneTimeCosts:       0.00,
				TotalExpenses:      7294.00,
				MonthBalance:       872.24,
				ReserveTransfers:   0.00,
				AccumulatedBalance: 12872.74,
			},
		},
		Totals: budget.BudgetSummaryTotals{
			Income:           8166.24,
			Cards:            5509.20,
			Fixed:            1000.00,
			Variable:         784.80,
			OneTimeCosts:     0.00,
			TotalExpenses:    7294.00,
			NetBalance:       872.24,
			ReserveTransfers: 0.00,
			FinalAccumulated: 12872.74,
		},
	}

	out := mapBudgetSummary(in)

	if out.Year != 2026 {
		t.Errorf("expected Year 2026, got %d", out.Year)
	}
	if out.InitialBalance != float32(12000.50) {
		t.Errorf("expected InitialBalance 12000.50, got %f", out.InitialBalance)
	}
	if out.EmergencyReserveTarget != float32(30000.00) {
		t.Errorf("expected EmergencyReserveTarget 30000.00, got %f", out.EmergencyReserveTarget)
	}
	if len(out.Months) != 1 {
		t.Fatalf("expected 1 month, got %d", len(out.Months))
	}

	m := out.Months[0]
	if m.Month != 10 {
		t.Errorf("expected Month 10, got %d", m.Month)
	}
	if m.Income != float32(8166.24) {
		t.Errorf("expected Income 8166.24, got %f", m.Income)
	}
	if m.Cards != float32(5509.20) {
		t.Errorf("expected Cards 5509.20, got %f", m.Cards)
	}
	if m.Fixed != float32(1000.00) {
		t.Errorf("expected Fixed 1000.00, got %f", m.Fixed)
	}
	if m.Variable != float32(784.80) {
		t.Errorf("expected Variable 784.80, got %f", m.Variable)
	}
	if m.TotalExpenses != float32(7294.00) {
		t.Errorf("expected TotalExpenses 7294.00, got %f", m.TotalExpenses)
	}
	if m.MonthBalance != float32(872.24) {
		t.Errorf("expected MonthBalance 872.24, got %f", m.MonthBalance)
	}
	if m.AccumulatedBalance != float32(12872.74) {
		t.Errorf("expected AccumulatedBalance 12872.74, got %f", m.AccumulatedBalance)
	}

	if out.Totals.Cards != float32(5509.20) {
		t.Errorf("expected Totals.Cards 5509.20, got %f", out.Totals.Cards)
	}
	if out.Totals.TotalExpenses != float32(7294.00) {
		t.Errorf("expected Totals.TotalExpenses 7294.00, got %f", out.Totals.TotalExpenses)
	}
	if out.Totals.NetBalance != float32(872.24) {
		t.Errorf("expected Totals.NetBalance 872.24, got %f", out.Totals.NetBalance)
	}
}

func TestMapBudgetView(t *testing.T) {
	in := budget.YearViewModel{
		Budget: budget.Budget{
			ID:             "2026",
			Year:           2026,
			InitialBalance: 5000,
		},
	}

	out := mapBudgetView(in)

	if out.Budget.Year != 2026 {
		t.Errorf("expected Year 2026, got %d", out.Budget.Year)
	}
	if out.Budget.InitialBalance != 5000 {
		t.Errorf("expected InitialBalance 5000, got %f", out.Budget.InitialBalance)
	}
}
