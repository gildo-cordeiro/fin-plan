package costitem

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
	Month         *int     `json:"month,omitempty"`
	DueDate       *string  `json:"dueDate,omitempty"`
}

type ConfirmCostItemRequest struct {
	ActualAmount *float64 `json:"actualAmount,omitempty"`
	PaidDate     *string  `json:"paidDate,omitempty"`
}
