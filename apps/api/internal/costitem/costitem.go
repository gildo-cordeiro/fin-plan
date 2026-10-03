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
