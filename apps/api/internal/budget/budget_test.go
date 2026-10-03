package budget_test

import (
	"testing"
	

	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/budget"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/cost"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/costitem"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/entry"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/item"
)

func TestNewBudget(t *testing.T) {
	b, err := budget.NewBudget(2026, 1000.0, 5000.0)
	if err != nil {
		t.Errorf("Unexpected error: %v", err)
	}
	if b.Year != 2026 || b.InitialBalance != 1000.0 || b.EmergencyReserveTarget != 5000.0 {
		t.Errorf("Budget not initialized correctly")
	}

	_, err = budget.NewBudget(1999, 0, 0)
	if err == nil {
		t.Errorf("Expected error for invalid year")
	}
}

func TestBudgetUpdate(t *testing.T) {
	b, _ := budget.NewBudget(2026, 1000.0, 5000.0)
	newBalance := 2000.0
	newReserve := 6000.0
	b.Update(&newBalance, &newReserve)
	
	if b.InitialBalance != 2000.0 {
		t.Errorf("Initial balance not updated")
	}
	if b.EmergencyReserveTarget != 6000.0 {
		t.Errorf("Emergency reserve target not updated")
	}
	if b.UpdatedAt.IsZero() {
		t.Errorf("UpdatedAt not set")
	}
}

func TestCalculateSummary(t *testing.T) {
	b, _ := budget.NewBudget(2026, 1000.0, 0)
	
	items := []item.Item{
		{
			Type: "renda",
			Entries: []entry.Entry{
				{Month: 1, PlannedAmount: 5000},
				{Month: 2, PlannedAmount: 5000},
			},
		},
		{
			Type: "fixa",
			Entries: []entry.Entry{
				{Month: 1, PlannedAmount: 1000},
			},
		},
	}
	
	m1 := 1
	costs := []cost.Cost{
		{
			DefaultMonth: &m1,
			Items: []costitem.CostItem{
				{PlannedAmount: 500},
			},
		},
	}
	
	summary := b.CalculateSummary(items, costs)
	
	if summary.Totals.Income != 10000 {
		t.Errorf("Expected income 10000, got %f", summary.Totals.Income)
	}
	if summary.Totals.Fixed != 1000 {
		t.Errorf("Expected fixed 1000, got %f", summary.Totals.Fixed)
	}
	if summary.Totals.OneTimeCosts != 500 {
		t.Errorf("Expected one time costs 500, got %f", summary.Totals.OneTimeCosts)
	}
	if summary.Totals.TotalExpenses != 1500 {
		t.Errorf("Expected total expenses 1500, got %f", summary.Totals.TotalExpenses)
	}
	
	// Month 1: 5000 - (1000 + 500) = 3500 balance. Initial = 1000. Accumulated = 4500
	if summary.Months[0].MonthBalance != 3500 {
		t.Errorf("Expected month 1 balance 3500, got %f", summary.Months[0].MonthBalance)
	}
	if summary.Months[0].AccumulatedBalance != 4500 {
		t.Errorf("Expected month 1 accumulated 4500, got %f", summary.Months[0].AccumulatedBalance)
	}
}
