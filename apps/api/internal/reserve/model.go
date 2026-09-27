package reserve

type ReserveMovement struct {
	ID       string  `json:"id"`
	BudgetID string  `json:"budgetId"`
	Month    int     `json:"month"`
	Amount   float64 `json:"amount"` // positivo = aporte, negativo = retirada
	Reason   *string `json:"reason,omitempty"`
}

type CreateReserveMovementRequest struct {
	BudgetID string  `json:"budgetId"`
	Month    int     `json:"month"`
	Amount   float64 `json:"amount"`
	Reason   *string `json:"reason,omitempty"`
}
