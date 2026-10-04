package api

import (
    "time"

	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/budget"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/cost"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/costitem"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/entry"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/goal"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/item"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/reserve"
	"github.com/oapi-codegen/runtime/types"
)

func mapBudget(b budget.Budget) Budget {
	return Budget{
		Id:                     b.ID,
		Year:                   b.Year,
		InitialBalance:         float32(b.InitialBalance),
		EmergencyReserveTarget: float32(b.EmergencyReserveTarget),
		CreatedAt:              b.CreatedAt,
		UpdatedAt:              b.UpdatedAt,
	}
}

func mapItem(i item.Item) Item {
	return Item{
		Id:       i.ID,
		BudgetId: i.BudgetID,
		Name:     i.Name,
		Type:     ItemType(i.Type),
	}
}

func mapEntry(e entry.Entry) Entry {
	var act *float32
	if e.ActualAmount != nil {
		v := float32(*e.ActualAmount)
		act = &v
	}
	var due, paid *types.Date
	if e.DueDate != nil && *e.DueDate != "" {
        if t, err := time.Parse("2006-01-02", *e.DueDate); err == nil {
            due = &types.Date{Time: t}
        }
	}
	if e.PaidDate != nil && *e.PaidDate != "" {
        if t, err := time.Parse("2006-01-02", *e.PaidDate); err == nil {
            paid = &types.Date{Time: t}
        }
	}
	return Entry{
		Id:            e.ID,
		ItemId:        e.ItemID,
		Month:         e.Month,
		PlannedAmount: float32(e.PlannedAmount),
		ActualAmount:  act,
		DueDate:       due,
		PaidDate:      paid,
	}
}

func mapItemWithEntries(i item.Item) ItemWithEntries {
	res := ItemWithEntries{
		Id:       i.ID,
		BudgetId: i.BudgetID,
		Name:     i.Name,
		Type:     ItemWithEntriesType(i.Type),
		Entries:  make([]Entry, len(i.Entries)),
	}
	for idx, e := range i.Entries {
		res.Entries[idx] = mapEntry(e)
	}
	return res
}

func mapCost(c cost.Cost) Cost {
	return Cost{
		Id:            c.ID,
		BudgetId:      c.BudgetID,
		Name:          c.Name,
		DefaultMonth:  c.DefaultMonth,
		MarginPercent: float32(c.MarginPercent),
		Notes:         c.Notes,
	}
}

func mapCostItem(ci costitem.CostItem) CostItem {
	var act *float32
	if ci.ActualAmount != nil {
		v := float32(*ci.ActualAmount)
		act = &v
	}
	var paid *types.Date
	if ci.PaidDate != nil && *ci.PaidDate != "" {
        if t, err := time.Parse("2006-01-02", *ci.PaidDate); err == nil {
            paid = &types.Date{Time: t}
        }
	}
	return CostItem{
		Id:            ci.ID,
		CostId:        ci.CostID,
		Name:          ci.Name,
		PlannedAmount: float32(ci.PlannedAmount),
		ActualAmount:  act,
		Month:         ci.Month,
		PaidDate:      paid,
	}
}

func mapCostWithItems(c cost.Cost) CostWithItems {
	res := CostWithItems{
		Id:            c.ID,
		BudgetId:      c.BudgetID,
		Name:          c.Name,
		DefaultMonth:  c.DefaultMonth,
		MarginPercent: float32(c.MarginPercent),
		Notes:         c.Notes,
		TotalPlanned:  0,
		TotalWithMargin: 0,
		Items:         make([]CostItem, len(c.Items)),
	}
	for idx, ci := range c.Items {
		res.Items[idx] = mapCostItem(ci)
	}
	return res
}

func mapGoal(g goal.Goal) Goal {
	return Goal{
		Id:           g.ID,
		Name:         g.Name,
		Description:  g.Description,
		TargetAmount: float32(g.TargetAmount),
		Color:        g.Color,
		Status:       GoalStatus(g.Status),
	}
}

func mapReserveMovement(rm reserve.ReserveMovement) ReserveMovement {
	return ReserveMovement{
		Id:       rm.ID,
		BudgetId: rm.BudgetID,
		Month:    rm.Month,
		Amount:   float32(rm.Amount),
		Reason:   rm.Reason,
	}
}
