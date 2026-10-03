package cost_test

import (
	"testing"

	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/cost"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/costitem"
)

func ptrFloat(f float64) *float64 { return &f }
func ptrInt(i int) *int           { return &i }
func ptrStr(s string) *string     { return &s }

func TestNewCost(t *testing.T) {
	c, err := cost.NewCost("b-123", "Viagem", ptrInt(5), 10.0, nil)
	if err != nil {
		t.Errorf("Unexpected error: %v", err)
	}
	if c.Name != "Viagem" || c.BudgetID != "b-123" || *c.DefaultMonth != 5 || c.MarginPercent != 10.0 {
		t.Errorf("Cost not initialized correctly")
	}

	_, err = cost.NewCost("b-123", "", nil, 0, nil)
	if err == nil {
		t.Errorf("Expected error for empty name")
	}

	_, err = cost.NewCost("b-123", "Teste", ptrInt(13), 0, nil)
	if err == nil {
		t.Errorf("Expected error for invalid month")
	}
}

func TestCostUpdate(t *testing.T) {
	c, _ := cost.NewCost("b-123", "Viagem", ptrInt(5), 10.0, nil)
	
	err := c.Update(ptrStr("Viagem Nova"), ptrInt(6), ptrFloat(20.0), ptrStr("Nota"))
	if err != nil {
		t.Errorf("Unexpected error: %v", err)
	}
	
	if c.Name != "Viagem Nova" {
		t.Errorf("Name not updated")
	}
	if *c.DefaultMonth != 6 {
		t.Errorf("DefaultMonth not updated")
	}
	if c.MarginPercent != 20.0 {
		t.Errorf("MarginPercent not updated")
	}
	if *c.Notes != "Nota" {
		t.Errorf("Notes not updated")
	}
	
	err = c.Update(ptrStr(""), nil, nil, nil)
	if err == nil {
		t.Errorf("Expected error for empty name")
	}
}

func TestCalculateTotals(t *testing.T) {
	c, _ := cost.NewCost("b-123", "Viagem", nil, 10.0, nil)
	c.Items = []costitem.CostItem{
		{PlannedAmount: 100},
		{PlannedAmount: 200},
	}
	
	c.CalculateTotals()
	
	if c.TotalPlanned != 300 {
		t.Errorf("Expected total planned 300, got %f", c.TotalPlanned)
	}
	if c.TotalWithMargin != 330 {
		t.Errorf("Expected total with margin 330, got %f", c.TotalWithMargin)
	}
}
