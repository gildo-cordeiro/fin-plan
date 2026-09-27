package budget

import (
	"time"

	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/cost"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/goal"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/item"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/reserve"
)

type Budget struct {
	ID                     string    `json:"id"`
	Year                   int       `json:"year"`
	InitialBalance         float64   `json:"initialBalance"`
	EmergencyReserveTarget float64   `json:"emergencyReserveTarget"`
	ReconciledMonth        *int      `json:"reconciledMonth,omitempty"`
	ReconciledBalance      *float64  `json:"reconciledBalance,omitempty"`
	CreatedAt              time.Time `json:"createdAt"`
	UpdatedAt              time.Time `json:"updatedAt"`
}

type CreateBudgetRequest struct {
	Year                   int      `json:"year"`
	InitialBalance         *float64 `json:"initialBalance,omitempty"`
	EmergencyReserveTarget *float64 `json:"emergencyReserveTarget,omitempty"`
	ReconciledMonth        *int     `json:"reconciledMonth,omitempty"`
	ReconciledBalance      *float64 `json:"reconciledBalance,omitempty"`
}

type PatchBudgetRequest struct {
	InitialBalance         *float64 `json:"initialBalance,omitempty"`
	EmergencyReserveTarget *float64 `json:"emergencyReserveTarget,omitempty"`
	ReconciledMonth        *int     `json:"reconciledMonth,omitempty"`
	ReconciledBalance      *float64 `json:"reconciledBalance,omitempty"`
}

type BudgetSummaryMonth struct {
	Month              int     `json:"month"`
	Income             float64 `json:"income"`
	Cards              float64 `json:"cards"`
	Fixed              float64 `json:"fixed"`
	Variable           float64 `json:"variable"`
	OneTimeCosts       float64 `json:"oneTimeCosts"`
	TotalExpenses      float64 `json:"totalExpenses"`
	MonthBalance       float64 `json:"monthBalance"`
	AccumulatedBalance float64 `json:"accumulatedBalance"`
}

type BudgetSummaryTotals struct {
	Income           float64 `json:"income"`
	Cards            float64 `json:"cards"`
	Fixed            float64 `json:"fixed"`
	Variable         float64 `json:"variable"`
	OneTimeCosts     float64 `json:"oneTimeCosts"`
	TotalExpenses    float64 `json:"totalExpenses"`
	NetBalance       float64 `json:"netBalance"`
	FinalAccumulated float64 `json:"finalAccumulated"`
}

type BudgetSummary struct {
	Year                   int                  `json:"year"`
	InitialBalance         float64              `json:"initialBalance"`
	EmergencyReserveTarget float64              `json:"emergencyReserveTarget"`
	ReconciledMonth        *int                 `json:"reconciledMonth,omitempty"`
	ReconciledBalance      *float64             `json:"reconciledBalance,omitempty"`
	Months                 []BudgetSummaryMonth `json:"months"`
	Totals                 BudgetSummaryTotals  `json:"totals"`
}

type YearViewModel struct {
	Budget           Budget                    `json:"budget"`
	Items            []item.Item               `json:"items"`
	Costs            []cost.Cost               `json:"costs"`
	Goals            []goal.Goal               `json:"goals"`
	ReserveMovements []reserve.ReserveMovement `json:"reserveMovements,omitempty"`
}
