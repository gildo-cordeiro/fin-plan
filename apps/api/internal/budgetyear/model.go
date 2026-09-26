package budgetyear

import (
	"time"

	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/budgetitem"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/goal"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/onetimecost"
)

type SimulationSettings struct {
	VarsPercent          float64 `json:"varsPercent" bson:"varsPercent"`
	RendaPercent         float64 `json:"rendaPercent" bson:"rendaPercent"`
	OneTimeMarginPercent float64 `json:"oneTimeMarginPercent" bson:"oneTimeMarginPercent"`
	InitialBalance       float64 `json:"initialBalance" bson:"initialBalance"`
	EmergencyReserve     float64 `json:"emergencyReserve" bson:"emergencyReserve"`
}

type BudgetYear struct {
	ID         string             `json:"id" bson:"_id"`
	Year       int                `json:"year" bson:"year"`
	Simulation SimulationSettings `json:"simulation" bson:"simulation"`
	CreatedAt  time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt  time.Time          `json:"updatedAt" bson:"updatedAt"`
}

type Month struct {
	ID           string `json:"id" bson:"_id"`
	BudgetYearID string `json:"budgetYearId" bson:"budgetYearId"`
	Name         string `json:"name" bson:"name"`
	ShortName    string `json:"shortName" bson:"shortName"`
	Year         int    `json:"year" bson:"year"`
	MonthIndex   int    `json:"monthIndex" bson:"monthIndex"`
}

type YearViewModel struct {
	Year         BudgetYear                `json:"year"`
	Months       []Month                   `json:"months"`
	Items        []budgetitem.BudgetItem   `json:"items"`
	OneTimeCosts []onetimecost.OneTimeCost `json:"oneTimeCosts"`
	Goals        []goal.Goal               `json:"goals"`
}

type CreateBudgetYearInput struct {
	Year       int                 `json:"year"`
	Simulation *SimulationSettings `json:"simulation,omitempty"`
}

type UpdateSimulationInput struct {
	VarsPercent          *float64 `json:"varsPercent,omitempty"`
	RendaPercent         *float64 `json:"rendaPercent,omitempty"`
	OneTimeMarginPercent *float64 `json:"oneTimeMarginPercent,omitempty"`
	InitialBalance       *float64 `json:"initialBalance,omitempty"`
	EmergencyReserve     *float64 `json:"emergencyReserve,omitempty"`
}

type CreateMonthInput struct {
	ID         string `json:"id,omitempty"`
	Name       string `json:"name"`
	ShortName  string `json:"shortName"`
	MonthIndex int    `json:"monthIndex"`
}
