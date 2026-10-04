package item_test

import (
	"testing"

	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/item"
)

func ptrStr(s string) *string { return &s }

func TestNewItem(t *testing.T) {
	i, err := item.NewItem("b-123", "Salário", "renda")
	if err != nil {
		t.Errorf("Unexpected error: %v", err)
	}
	if i.Name != "Salário" || i.Type != "renda" || i.BudgetID != "b-123" {
		t.Errorf("Item not initialized correctly")
	}

	_, err = item.NewItem("b-123", "", "renda")
	if err == nil {
		t.Errorf("Expected error for empty name")
	}

	_, err = item.NewItem("b-123", "Teste", "invalido")
	if err == nil {
		t.Errorf("Expected error for invalid type")
	}
}

func TestItemUpdate(t *testing.T) {
	i, _ := item.NewItem("b-123", "Salário", "renda")
	
	err := i.Update(ptrStr("Salário Novo"), ptrStr("FIXA"), nil)
	if err != nil {
		t.Errorf("Unexpected error: %v", err)
	}
	
	if i.Name != "Salário Novo" {
		t.Errorf("Name not updated")
	}
	if i.Type != "fixa" {
		t.Errorf("Type not updated to lowercase")
	}
	
	err = i.Update(ptrStr(""), nil, nil)
	if err == nil {
		t.Errorf("Expected error for empty name")
	}
	
	err = i.Update(nil, ptrStr("invalido"), nil)
	if err == nil {
		t.Errorf("Expected error for invalid type")
	}
}
