package budget

import (
	cost "github.com/gildo-cordeiro/fin-plan/apps/api/internal/cost"
	goal "github.com/gildo-cordeiro/fin-plan/apps/api/internal/goal"
	item "github.com/gildo-cordeiro/fin-plan/apps/api/internal/item"
	reserve "github.com/gildo-cordeiro/fin-plan/apps/api/internal/reserve"
)

type YearViewModel struct {
	Budget           Budget                    `json:"budget"`
	Items            []item.Item               `json:"items"`
	Costs            []cost.Cost               `json:"costs"`
	Goals            []goal.Goal               `json:"goals"`
	ReserveMovements []reserve.ReserveMovement `json:"reserveMovements,omitempty"`
}
