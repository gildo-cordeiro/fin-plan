package reserve

type CreateReserveMovementRequest struct {
	BudgetID string  `json:"budgetId"`
	Month    int     `json:"month"`
	Amount   float64 `json:"amount"`
	Reason   *string `json:"reason,omitempty"`
}
