// Package budget contains the domain model structs that mirror the TypeScript
// BudgetState defined in src/types/budget.ts. These structs use json tags that
// match the exact field names used by the frontend, preserving wire-format
// compatibility with the existing API contract (docs/API.md).
//
// Fields use pointer types or omitempty where the TypeScript interface marks
// them as optional (e.g. `off?: boolean`, `notes?: string`).
package budget

import "time"

// MonthItem represents a planning month.
type MonthItem struct {
	ID         string `json:"id" bson:"id"`
	Name       string `json:"name" bson:"name"`
	ShortName  string `json:"shortName" bson:"shortName"`
	Year       int    `json:"year" bson:"year"`
	MonthIndex int    `json:"monthIndex" bson:"monthIndex"`
}

// BudgetItem represents an income or expense line item.
// The Values map uses month IDs (e.g. "2026-10") as keys.
type BudgetItem struct {
	ID       string             `json:"id" bson:"id"`
	Name     string             `json:"name" bson:"name"`
	Category string             `json:"category" bson:"category"`
	Values   map[string]float64 `json:"values" bson:"values"`
	Off      *bool              `json:"off,omitempty" bson:"off,omitempty"`
	Notes    *string            `json:"notes,omitempty" bson:"notes,omitempty"`
	DueDate  *int               `json:"dueDate,omitempty" bson:"dueDate,omitempty"`
}

// OneTimeCost represents a one-off expense allocated to a specific month.
type OneTimeCost struct {
	ID            string  `json:"id" bson:"id"`
	Name          string  `json:"name" bson:"name"`
	Value         float64 `json:"value" bson:"value"`
	TargetMonthID *string `json:"targetMonthId,omitempty" bson:"targetMonthId,omitempty"`
	Off           *bool   `json:"off,omitempty" bson:"off,omitempty"`
	Notes         *string `json:"notes,omitempty" bson:"notes,omitempty"`
}

// SimulationSettings holds the "what-if" scenario parameters.
type SimulationSettings struct {
	VarsPercent         float64 `json:"varsPercent" bson:"varsPercent"`
	RendaPercent        float64 `json:"rendaPercent" bson:"rendaPercent"`
	OneTimeMarginPercent float64 `json:"oneTimeMarginPercent" bson:"oneTimeMarginPercent"`
	InitialBalance      float64 `json:"initialBalance" bson:"initialBalance"`
	EmergencyReserve    float64 `json:"emergencyReserve" bson:"emergencyReserve"`
}

// GoalContribution represents a single monetary contribution toward a goal.
type GoalContribution struct {
	ID     string  `json:"id" bson:"id"`
	Date   string  `json:"date" bson:"date"`
	Amount float64 `json:"amount" bson:"amount"`
	Note   *string `json:"note,omitempty" bson:"note,omitempty"`
}

// FinancialGoal represents a savings goal with its contribution history.
type FinancialGoal struct {
	ID            string             `json:"id" bson:"id"`
	Name          string             `json:"name" bson:"name"`
	Description   *string            `json:"description,omitempty" bson:"description,omitempty"`
	TargetAmount  float64            `json:"targetAmount" bson:"targetAmount"`
	Icon          *string            `json:"icon,omitempty" bson:"icon,omitempty"`
	Color         *string            `json:"color,omitempty" bson:"color,omitempty"`
	Status        string             `json:"status" bson:"status"`
	Contributions []GoalContribution `json:"contributions" bson:"contributions"`
}

// ExpenseLists groups expense items by category.
type ExpenseLists struct {
	Cartoes []BudgetItem `json:"cartoes" bson:"cartoes"`
	Fixas   []BudgetItem `json:"fixas" bson:"fixas"`
	Vars    []BudgetItem `json:"vars" bson:"vars"`
}

// BudgetState is the complete application state persisted as a single
// MongoDB document. This struct mirrors the TypeScript BudgetState exactly.
type BudgetState struct {
	Version      int                `json:"version" bson:"version"`
	Months       []MonthItem        `json:"months" bson:"months"`
	Simulation   SimulationSettings `json:"simulation" bson:"simulation"`
	Incomes      []BudgetItem       `json:"incomes" bson:"incomes"`
	Lists        ExpenseLists       `json:"lists" bson:"lists"`
	OneTimeCosts []OneTimeCost      `json:"oneTimeCosts" bson:"oneTimeCosts"`
	Goals        []FinancialGoal    `json:"goals" bson:"goals"`
}

// BudgetDocument is the MongoDB document shape: _id + data envelope + metadata.
type BudgetDocument struct {
	ID        string       `bson:"_id"`
	Data      *BudgetState `bson:"data,omitempty"`
	UpdatedAt *time.Time   `bson:"updatedAt,omitempty"`
}

// --- API response types (match docs/API.md exactly) ---

// GetBudgetResponse is the JSON returned by GET /api/v1/budget.
type GetBudgetResponse struct {
	Exists    bool         `json:"exists"`
	Data      *BudgetState `json:"data"`
	UpdatedAt *time.Time   `json:"updatedAt,omitempty"`
}

// PostBudgetResponse is the JSON returned by POST /api/v1/budget on success.
type PostBudgetResponse struct {
	Success   bool      `json:"success"`
	Message   string    `json:"message"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// ErrorResponse is the standard error envelope.
type ErrorResponse struct {
	Error string `json:"error"`
}
