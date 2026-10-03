package cost

import (
	"errors"
	"strings"

	costitem "github.com/gildo-cordeiro/fin-plan/apps/api/internal/costitem"
)

type Cost struct {
	ID              string              `json:"id"`
	BudgetID        string              `json:"budgetId"`
	Name            string              `json:"name"`
	DefaultMonth    *int                `json:"defaultMonth"`
	MarginPercent   float64             `json:"marginPercent"`
	Notes           *string             `json:"notes,omitempty"`
	Items           []costitem.CostItem `json:"items"`
	TotalPlanned    float64             `json:"totalPlanned"`
	TotalWithMargin float64             `json:"totalWithMargin"`
}

func NewCost(budgetID, name string, defaultMonth *int, marginPercent float64, notes *string) (*Cost, error) {
	if strings.TrimSpace(name) == "" {
		return nil, errors.New("nome do custo é obrigatório")
	}
	if strings.TrimSpace(budgetID) == "" {
		return nil, errors.New("budgetId é obrigatório")
	}
	if defaultMonth != nil && (*defaultMonth < 1 || *defaultMonth > 12) {
		return nil, errors.New("defaultMonth deve estar entre 1 e 12")
	}

	return &Cost{
		BudgetID:      budgetID,
		Name:          name,
		DefaultMonth:  defaultMonth,
		MarginPercent: marginPercent,
		Notes:         notes,
	}, nil
}

func (c *Cost) CalculateTotals() {
	c.TotalPlanned = 0
	for _, it := range c.Items {
		c.TotalPlanned += it.PlannedAmount
	}
	c.TotalWithMargin = c.TotalPlanned * (1.0 + (c.MarginPercent / 100.0))
}

func (c *Cost) Update(name *string, defaultMonth *int, marginPercent *float64, notes *string) error {
	if name != nil {
		if strings.TrimSpace(*name) == "" {
			return errors.New("nome do custo não pode ser vazio")
		}
		c.Name = *name
	}
	if defaultMonth != nil {
		if *defaultMonth != 0 && (*defaultMonth < 1 || *defaultMonth > 12) {
			return errors.New("defaultMonth deve estar entre 1 e 12")
		}
		if *defaultMonth == 0 {
			c.DefaultMonth = nil
		} else {
			c.DefaultMonth = defaultMonth
		}
	}
	if marginPercent != nil {
		c.MarginPercent = *marginPercent
	}
	if notes != nil {
		c.Notes = notes
	}
	return nil
}
