package entry

type Entry struct {
	ID            string   `json:"id"`
	ItemID        string   `json:"itemId"`
	Month         int      `json:"month"`
	PlannedAmount float64  `json:"plannedAmount"`
	ActualAmount  *float64 `json:"actualAmount"`
	DueDate       *string  `json:"dueDate"`
	PaidDate      *string  `json:"paidDate"`
}

type PatchEntryRequest struct {
	PlannedAmount *float64 `json:"plannedAmount,omitempty"`
	ActualAmount  *float64 `json:"actualAmount,omitempty"`
	DueDate       *string  `json:"dueDate,omitempty"`
	PaidDate      *string  `json:"paidDate,omitempty"`
}
