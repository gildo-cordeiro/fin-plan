package costitem

type CostItem struct {
	ID            string   `json:"id"`
	CostID        string   `json:"costId"`
	Name          string   `json:"name"`
	PlannedAmount float64  `json:"plannedAmount"`
	ActualAmount  *float64 `json:"actualAmount"`
	Month         *int     `json:"month"`
	DueDate       *string  `json:"dueDate"`
	PaidDate      *string  `json:"paidDate"`
}

type CreateCostItemRequest struct {
	Name          string   `json:"name"`
	PlannedAmount float64  `json:"plannedAmount"`
	ActualAmount  *float64 `json:"actualAmount,omitempty"`
	Month         *int     `json:"month,omitempty"`
	DueDate       *string  `json:"dueDate,omitempty"`
	PaidDate      *string  `json:"paidDate,omitempty"`
}

type PatchCostItemRequest struct {
	Name          *string  `json:"name,omitempty"`
	PlannedAmount *float64 `json:"plannedAmount,omitempty"`
	ActualAmount  *float64 `json:"actualAmount,omitempty"`
	Month         *int     `json:"month,omitempty"`
	DueDate       *string  `json:"dueDate,omitempty"`
	PaidDate      *string  `json:"paidDate,omitempty"`
}
