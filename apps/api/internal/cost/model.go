package cost

import (
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/costitem"
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

type CreateCostRequest struct {
	BudgetID      string  `json:"budgetId"`
	Name          string  `json:"name"`
	DefaultMonth  *int    `json:"defaultMonth,omitempty"`
	MarginPercent float64 `json:"marginPercent,omitempty"`
	Notes         *string `json:"notes,omitempty"`
}

type PatchCostRequest struct {
	Name          *string  `json:"name,omitempty"`
	DefaultMonth  *int     `json:"defaultMonth,omitempty"`
	MarginPercent *float64 `json:"marginPercent,omitempty"`
	Notes         *string  `json:"notes,omitempty"`
}
