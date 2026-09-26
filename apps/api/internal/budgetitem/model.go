package budgetitem

type BudgetItem struct {
	ID      string             `json:"id" bson:"_id"`
	Type    string             `json:"type" bson:"type"`
	Name    string             `json:"name" bson:"name"`
	Values  map[string]float64 `json:"values" bson:"values"`
	Off     *bool              `json:"off,omitempty" bson:"off,omitempty"`
	Notes   *string            `json:"notes,omitempty" bson:"notes,omitempty"`
	DueDate *int               `json:"dueDate,omitempty" bson:"dueDate,omitempty"`
}

type UpdateBudgetItemInput struct {
	Type    *string            `json:"type,omitempty"`
	Name    *string            `json:"name,omitempty"`
	Values  map[string]float64 `json:"values,omitempty"`
	Off     *bool              `json:"off,omitempty"`
	Notes   *string            `json:"notes,omitempty"`
	DueDate *int               `json:"dueDate,omitempty"`
}
