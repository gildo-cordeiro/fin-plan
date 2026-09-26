package budget

import "time"

type MonthItem struct {
	ID         string `json:"id" bson:"id"`
	Name       string `json:"name" bson:"name"`
	ShortName  string `json:"shortName" bson:"shortName"`
	Year       int    `json:"year" bson:"year"`
	MonthIndex int    `json:"monthIndex" bson:"monthIndex"`
}

type BudgetItem struct {
	ID       string             `json:"id" bson:"id"`
	Name     string             `json:"name" bson:"name"`
	Category string             `json:"category" bson:"category"`
	Values   map[string]float64 `json:"values" bson:"values"`
	Off      *bool              `json:"off,omitempty" bson:"off,omitempty"`
	Notes    *string            `json:"notes,omitempty" bson:"notes,omitempty"`
	DueDate  *int               `json:"dueDate,omitempty" bson:"dueDate,omitempty"`
}

type OneTimeCost struct {
	ID            string  `json:"id" bson:"id"`
	Name          string  `json:"name" bson:"name"`
	Value         float64 `json:"value" bson:"value"`
	TargetMonthID *string `json:"targetMonthId,omitempty" bson:"targetMonthId,omitempty"`
	Off           *bool   `json:"off,omitempty" bson:"off,omitempty"`
	Notes         *string `json:"notes,omitempty" bson:"notes,omitempty"`
}

type SimulationSettings struct {
	VarsPercent          float64 `json:"varsPercent" bson:"varsPercent"`
	RendaPercent         float64 `json:"rendaPercent" bson:"rendaPercent"`
	OneTimeMarginPercent float64 `json:"oneTimeMarginPercent" bson:"oneTimeMarginPercent"`
	InitialBalance       float64 `json:"initialBalance" bson:"initialBalance"`
	EmergencyReserve     float64 `json:"emergencyReserve" bson:"emergencyReserve"`
}

type GoalContribution struct {
	ID     string  `json:"id" bson:"id"`
	Date   string  `json:"date" bson:"date"`
	Amount float64 `json:"amount" bson:"amount"`
	Note   *string `json:"note,omitempty" bson:"note,omitempty"`
}

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

type ExpenseLists struct {
	Cartoes []BudgetItem `json:"cartoes" bson:"cartoes"`
	Fixas   []BudgetItem `json:"fixas" bson:"fixas"`
	Vars    []BudgetItem `json:"vars" bson:"vars"`
}

type BudgetState struct {
	Version      int                `json:"version" bson:"version"`
	Months       []MonthItem        `json:"months" bson:"months"`
	Simulation   SimulationSettings `json:"simulation" bson:"simulation"`
	Incomes      []BudgetItem       `json:"incomes" bson:"incomes"`
	Lists        ExpenseLists       `json:"lists" bson:"lists"`
	OneTimeCosts []OneTimeCost      `json:"oneTimeCosts" bson:"oneTimeCosts"`
	Goals        []FinancialGoal    `json:"goals" bson:"goals"`
}

type BudgetDocument struct {
	ID        string       `bson:"_id"`
	Data      *BudgetState `bson:"data,omitempty"`
	UpdatedAt *time.Time   `bson:"updatedAt,omitempty"`
}

type GetBudgetResponse struct {
	Exists    bool         `json:"exists"`
	Data      *BudgetState `json:"data"`
	UpdatedAt *time.Time   `json:"updatedAt,omitempty"`
}

type PostBudgetResponse struct {
	Success   bool      `json:"success"`
	Message   string    `json:"message"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}
