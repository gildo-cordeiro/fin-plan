package item

import (
	"time"

	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/entry"
)

type Item struct {
	ID        string        `json:"id"`
	BudgetID  string        `json:"budgetId"`
	Name      string        `json:"name"`
	Type      string        `json:"type"` // 'renda' | 'fixa' | 'variavel' | 'cartao'
	CreatedAt time.Time     `json:"createdAt"`
	Entries   []entry.Entry `json:"entries,omitempty"`
}

type CreateItemRequest struct {
	BudgetID string `json:"budgetId"`
	Name     string `json:"name"`
	Type     string `json:"type"`
}

type PatchItemRequest struct {
	Name *string `json:"name,omitempty"`
	Type *string `json:"type,omitempty"`
}
