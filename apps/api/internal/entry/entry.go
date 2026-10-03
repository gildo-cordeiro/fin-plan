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
