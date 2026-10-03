package item

import (
	"errors"
	"fmt"
	"strings"
	"time"

	entry "github.com/gildo-cordeiro/fin-plan/apps/api/internal/entry"
)

type Item struct {
	ID        string        `json:"id"`
	BudgetID  string        `json:"budgetId"`
	Name      string        `json:"name"`
	Type      string        `json:"type"` // 'renda' | 'fixa' | 'variavel' | 'cartao'
	CreatedAt time.Time     `json:"createdAt"`
	Entries   []entry.Entry `json:"entries,omitempty"`
}

func isValidType(t string) bool {
	t = strings.ToLower(strings.TrimSpace(t))
	return t == "renda" || t == "fixa" || t == "variavel" || t == "cartao"
}

func NewItem(budgetID, name, itemType string) (*Item, error) {
	if strings.TrimSpace(name) == "" {
		return nil, errors.New("nome do item é obrigatório")
	}
	if strings.TrimSpace(budgetID) == "" {
		return nil, errors.New("budgetId é obrigatório")
	}
	itemType = strings.ToLower(strings.TrimSpace(itemType))
	if !isValidType(itemType) {
		return nil, fmt.Errorf("tipo '%s' inválido; deve ser renda, fixa, variavel ou cartao", itemType)
	}

	return &Item{
		BudgetID: budgetID,
		Name:     name,
		Type:     itemType,
	}, nil
}

func (i *Item) Update(name *string, itemType *string) error {
	if name != nil {
		if strings.TrimSpace(*name) == "" {
			return errors.New("nome do item não pode ser vazio")
		}
		i.Name = *name
	}
	if itemType != nil {
		t := strings.ToLower(strings.TrimSpace(*itemType))
		if !isValidType(t) {
			return fmt.Errorf("tipo '%s' inválido; deve ser renda, fixa, variavel ou cartao", t)
		}
		i.Type = t
	}
	return nil
}
