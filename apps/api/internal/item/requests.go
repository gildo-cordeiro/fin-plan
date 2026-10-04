package item

type CreateItemRequest struct {
	BudgetID string `json:"budgetId"`
	Name     string `json:"name"`
	Type     string `json:"type"`
}

type PatchItemRequest struct {
	Name *string `json:"name,omitempty"`
	Type *string `json:"type,omitempty"`
	Off  *bool   `json:"off,omitempty"`
}
