package item

import (
	"errors"
	"fmt"
	"strings"
	"time"

	entry "github.com/gildo-cordeiro/fin-plan/apps/api/internal/entry"
)

type ItemType string

const (
	ItemTypeIncome   ItemType = "renda"
	ItemTypeCard     ItemType = "cartao"
	ItemTypeFixed    ItemType = "fixa"
	ItemTypeVariable ItemType = "variavel"
)

type Item struct {
	ID        string        `json:"id"`
	BudgetID  string        `json:"budgetId"`
	Name      string        `json:"name"`
	Type      ItemType      `json:"type"`
	Off       bool          `json:"off"`
	CreatedAt time.Time     `json:"createdAt"`
	Entries   []entry.Entry `json:"entries,omitempty"`
}

func isValidType(t ItemType) bool {
	return t == ItemTypeIncome || t == ItemTypeFixed || t == ItemTypeVariable || t == ItemTypeCard
}

func NewItem(budgetID, name string, itemType string) (*Item, error) {
	if strings.TrimSpace(name) == "" {
		return nil, errors.New("nome do item é obrigatório")
	}
	if strings.TrimSpace(budgetID) == "" {
		return nil, errors.New("budgetId é obrigatório")
	}
	t := ItemType(strings.ToLower(strings.TrimSpace(itemType)))
	if !isValidType(t) {
		return nil, fmt.Errorf("tipo '%s' inválido; deve ser renda, fixa, variavel ou cartao", t)
	}

	return &Item{
		BudgetID: budgetID,
		Name:     name,
		Type:     t,
	}, nil
}

func (i *Item) Update(name *string, itemType *string, off *bool) error {
	if name != nil {
		if strings.TrimSpace(*name) == "" {
			return errors.New("nome do item não pode ser vazio")
		}
		i.Name = *name
	}
	if itemType != nil {
		t := ItemType(strings.ToLower(strings.TrimSpace(*itemType)))
		if !isValidType(t) {
			return fmt.Errorf("tipo '%s' inválido; deve ser renda, fixa, variavel ou cartao", t)
		}
		i.Type = t
	}
	if off != nil {
		i.Off = *off
	}
	return nil
}
