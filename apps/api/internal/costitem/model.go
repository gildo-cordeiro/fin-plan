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

// PatchCostItemRequest edita dados de planejamento do item.
// Confirmar/desmarcar pagamento é feito pelos endpoints /confirm.
type PatchCostItemRequest struct {
	Name          *string  `json:"name,omitempty"`
	PlannedAmount *float64 `json:"plannedAmount,omitempty"`
	Month         *int     `json:"month,omitempty"`
	DueDate       *string  `json:"dueDate,omitempty"`
}

// ConfirmCostItemRequest é o corpo de POST /costs/{costId}/items/{id}/confirm.
// Ambos os campos são opcionais:
//   - actualAmount ausente → usa o planned_amount do item
//   - paidDate ausente     → usa a data atual do servidor
type ConfirmCostItemRequest struct {
	ActualAmount *float64 `json:"actualAmount,omitempty"`
	PaidDate     *string  `json:"paidDate,omitempty"`
}
