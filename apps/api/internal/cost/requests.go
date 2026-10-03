package cost

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
