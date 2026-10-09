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
		Id:                             b.ID,
		Year:                           b.Year,
		InitialBalance:                 float32(b.InitialBalance),
		EmergencyReserveTarget:         float32(b.EmergencyReserveTarget),
		EmergencyReserveInitialBalance: float32(b.EmergencyReserveInitialBalance),
		CreatedAt:                      b.CreatedAt,
		UpdatedAt:                      b.UpdatedAt,
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

func mapMonthSummary(m budget.BudgetSummaryMonth) MonthSummary {
	return MonthSummary{
		Month:              m.Month,
		Income:             float32(m.Income),
		Cards:              float32(m.Cards),
		Fixed:              float32(m.Fixed),
		Variable:           float32(m.Variable),
		OneTimeCosts:       float32(m.OneTimeCosts),
		TotalExpenses:      float32(m.TotalExpenses),
		MonthBalance:       float32(m.MonthBalance),
		ReserveTransfers:   float32(m.ReserveTransfers),
		AccumulatedBalance: float32(m.AccumulatedBalance),
		ReserveBalance:     float32(m.ReserveBalance),
	}
}

func mapYearTotals(t budget.BudgetSummaryTotals) YearTotals {
	return YearTotals{
		Income:           float32(t.Income),
		Cards:            float32(t.Cards),
		Fixed:            float32(t.Fixed),
		Variable:         float32(t.Variable),
		OneTimeCosts:     float32(t.OneTimeCosts),
		TotalExpenses:    float32(t.TotalExpenses),
		NetBalance:       float32(t.NetBalance),
		FinalAccumulated: float32(t.FinalAccumulated),
	}
}

// BudgetSummaryResponse representa a resposta HTTP consolidada do resumo orçamentário anual e mensal.
type BudgetSummaryResponse = GetApiV1BudgetsYearSummary200JSONResponse

func mapBudgetSummary(s budget.BudgetSummary) BudgetSummaryResponse {
	months := make([]MonthSummary, len(s.Months))
	for i, m := range s.Months {
		months[i] = mapMonthSummary(m)
	}
	return BudgetSummaryResponse{
		Year:                           s.Year,
		InitialBalance:                 float32(s.InitialBalance),
		EmergencyReserveTarget:         float32(s.EmergencyReserveTarget),
		EmergencyReserveInitialBalance: float32(s.EmergencyReserveInitialBalance),
		Months:                         months,
		Totals:                         mapYearTotals(s.Totals),
	}
}

// BudgetYearViewResponse representa a visão anual completa do orçamento com itens, custos e reservas.
type BudgetYearViewResponse = GetApiV1BudgetsYear200JSONResponse

func mapBudgetView(view budget.YearViewModel) BudgetYearViewResponse {
	items := make([]ItemWithEntries, len(view.Items))
	for i, it := range view.Items {
		items[i] = mapItemWithEntries(it)
	}

	costs := make([]CostWithItems, len(view.Costs))
	for i, c := range view.Costs {
		costs[i] = mapCostWithItems(c)
	}

	reserves := make([]ReserveMovement, len(view.ReserveMovements))
	for i, r := range view.ReserveMovements {
		reserves[i] = mapReserveMovement(r)
	}

	return BudgetYearViewResponse{
		Budget:           mapBudget(view.Budget),
		Costs:            costs,
		Items:            items,
		ReserveMovements: reserves,
	}
}
