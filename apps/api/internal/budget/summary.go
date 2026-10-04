package budget

type BudgetSummaryMonth struct {
	Month              int     `json:"month"`
	Income             float64 `json:"income"`
	Cards              float64 `json:"cards"`
	Fixed              float64 `json:"fixed"`
	Variable           float64 `json:"variable"`
	OneTimeCosts       float64 `json:"oneTimeCosts"`
	TotalExpenses      float64 `json:"totalExpenses"`
	MonthBalance       float64 `json:"monthBalance"`
	ReserveTransfers   float64 `json:"reserveTransfers"`
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
	ReserveTransfers float64 `json:"reserveTransfers"`
	FinalAccumulated float64 `json:"finalAccumulated"`
}

type BudgetSummary struct {
	Year                   int                  `json:"year"`
	InitialBalance         float64              `json:"initialBalance"`
	EmergencyReserveTarget float64              `json:"emergencyReserveTarget"`
	Months                 []BudgetSummaryMonth `json:"months"`
	Totals                 BudgetSummaryTotals  `json:"totals"`
}
