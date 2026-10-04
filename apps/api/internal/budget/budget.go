package budget

import (
	"errors"
	"time"

	cost "github.com/gildo-cordeiro/fin-plan/apps/api/internal/cost"
	item "github.com/gildo-cordeiro/fin-plan/apps/api/internal/item"
	reserve "github.com/gildo-cordeiro/fin-plan/apps/api/internal/reserve"
)

type Budget struct {
	ID                     string    `json:"id"`
	Year                   int       `json:"year"`
	InitialBalance         float64   `json:"initialBalance"`
	EmergencyReserveTarget float64   `json:"emergencyReserveTarget"`
	CreatedAt              time.Time `json:"createdAt"`
	UpdatedAt              time.Time `json:"updatedAt"`
}

func NewBudget(year int, initialBalance float64, emergencyReserveTarget float64) (*Budget, error) {
	if year < 2000 || year > 2100 {
		return nil, errors.New("ano deve ser entre 2000 e 2100")
	}
	return &Budget{
		Year:                   year,
		InitialBalance:         initialBalance,
		EmergencyReserveTarget: emergencyReserveTarget,
	}, nil
}

func (b *Budget) Update(initialBalance *float64, emergencyReserveTarget *float64) {
	if initialBalance != nil {
		b.InitialBalance = *initialBalance
	}
	if emergencyReserveTarget != nil {
		b.EmergencyReserveTarget = *emergencyReserveTarget
	}
	b.UpdatedAt = time.Now()
}

func (b *Budget) CalculateSummary(items []item.Item, costs []cost.Cost, movements []reserve.ReserveMovement) BudgetSummary {
	summary := BudgetSummary{
		Year:                   b.Year,
		InitialBalance:         b.InitialBalance,
		EmergencyReserveTarget: b.EmergencyReserveTarget,
		Months:                 make([]BudgetSummaryMonth, 12),
	}

	runningAccumulated := b.InitialBalance

	getEffectiveAmount := func(planned float64, actual *float64, paidDate *string) float64 {
		if paidDate != nil && actual != nil {
			return *actual
		}
		if actual != nil && *actual > 0 {
			return *actual
		}
		return planned
	}

	for monthIndex := 0; monthIndex < 12; monthIndex++ {
		month := monthIndex + 1
		var income, cards, fixed, variable, oneTimeCosts float64

		for _, it := range items {
			for _, entry := range it.Entries {
				if entry.Month == month {
					val := getEffectiveAmount(entry.PlannedAmount, entry.ActualAmount, entry.PaidDate)
					switch it.Type {
					case "renda":
						income += val
					case "cartao":
						cards += val
					case "fixa":
						fixed += val
					case "variavel":
						variable += val
					}
				}
			}
		}

		for _, c := range costs {
			for _, ci := range c.Items {
				itemMonth := c.DefaultMonth
				if ci.Month != nil {
					itemMonth = ci.Month
				}
				if itemMonth != nil && *itemMonth == month {
					val := getEffectiveAmount(ci.PlannedAmount, ci.ActualAmount, ci.PaidDate)
					oneTimeCosts += val
				}
			}
		}

		var reserveTransfers float64
		for _, m := range movements {
			if m.Month == month {
				reserveTransfers += m.Amount
			}
		}

		totalExpenses := cards + fixed + variable + oneTimeCosts
		monthBalance := income - totalExpenses
		// Retirada (-Amount) aumenta o saldo acumulado (entra no caixa)
		// Aporte (+Amount) diminui o saldo acumulado (sai do caixa)
		runningAccumulated += monthBalance - reserveTransfers

		summary.Months[monthIndex] = BudgetSummaryMonth{
			Month:              month,
			Income:             income,
			Cards:              cards,
			Fixed:              fixed,
			Variable:           variable,
			OneTimeCosts:       oneTimeCosts,
			TotalExpenses:      totalExpenses,
			MonthBalance:       monthBalance,
			ReserveTransfers:   reserveTransfers,
			AccumulatedBalance: runningAccumulated,
		}

		summary.Totals.Income += income
		summary.Totals.Cards += cards
		summary.Totals.Fixed += fixed
		summary.Totals.Variable += variable
		summary.Totals.OneTimeCosts += oneTimeCosts
		summary.Totals.ReserveTransfers += reserveTransfers
	}

	for _, c := range costs {
		for _, ci := range c.Items {
			if ci.Month == nil && c.DefaultMonth == nil {
				val := getEffectiveAmount(ci.PlannedAmount, ci.ActualAmount, ci.PaidDate)
				summary.Totals.OneTimeCosts += val
			}
		}
	}

	summary.Totals.TotalExpenses = summary.Totals.Cards + summary.Totals.Fixed + summary.Totals.Variable + summary.Totals.OneTimeCosts
	summary.Totals.NetBalance = summary.Totals.Income - summary.Totals.TotalExpenses
	summary.Totals.FinalAccumulated = b.InitialBalance + summary.Totals.NetBalance - summary.Totals.ReserveTransfers

	return summary
}
