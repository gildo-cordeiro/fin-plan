package api

import (

	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/budget"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/cost"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/costitem"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/entry"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/goal"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/item"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/reserve"
)

type Server struct {
	BudgetSvc    *budget.Service
	CostSvc      *cost.Service
	CostItemSvc  *costitem.Service
	EntrySvc     *entry.Service
	GoalSvc      *goal.Service
	ItemSvc      *item.Service
	ReserveSvc   *reserve.Service
}

var _ StrictServerInterface = (*Server)(nil)
