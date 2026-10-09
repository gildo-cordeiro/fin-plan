package api

import (
	"context"
	"strconv"

	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/budget"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/cost"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/costitem"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/entry"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/goal"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/item"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/reserve"
)

// 1. Budgets
func (s *Server) GetApiV1Budgets(ctx context.Context, request GetApiV1BudgetsRequestObject) (GetApiV1BudgetsResponseObject, error) {
	budgets, err := s.BudgetSvc.GetAll(ctx)
	if err != nil {
		return nil, err
	}
	res := make([]Budget, 0, len(budgets))
	for _, b := range budgets {
		res = append(res, mapBudget(b))
	}
	return GetApiV1Budgets200JSONResponse(res), nil
}

func (s *Server) PostApiV1Budgets(ctx context.Context, request PostApiV1BudgetsRequestObject) (PostApiV1BudgetsResponseObject, error) {
	req := budget.CreateBudgetRequest{
		Year: request.Body.Year,
	}
	v := float64(request.Body.InitialBalance)
	req.InitialBalance = &v
	v2 := float64(request.Body.EmergencyReserveTarget)
	req.EmergencyReserveTarget = &v2
	
	b, err := s.BudgetSvc.Create(ctx, req)
	if err != nil {
		return nil, err
	}
	return PostApiV1Budgets201JSONResponse(mapBudget(*b)), nil
}

func (s *Server) GetApiV1BudgetsYear(ctx context.Context, request GetApiV1BudgetsYearRequestObject) (GetApiV1BudgetsYearResponseObject, error) {
	year, err := strconv.Atoi(request.Year)
	if err != nil {
		return nil, err
	}
	view, err := s.BudgetSvc.GetYearViewModel(ctx, year)
	if err != nil {
		return nil, err
	}

	return mapBudgetView(*view), nil
}

func (s *Server) PatchApiV1BudgetsYear(ctx context.Context, request PatchApiV1BudgetsYearRequestObject) (PatchApiV1BudgetsYearResponseObject, error) {
	year, err := strconv.Atoi(request.Year)
	if err != nil {
		return nil, err
	}
	req := budget.PatchBudgetRequest{}
	v := float64(*request.Body.InitialBalance)
		req.InitialBalance = &v
	v2 := float64(*request.Body.EmergencyReserveTarget)
	req.EmergencyReserveTarget = &v2
	_, err = s.BudgetSvc.Patch(ctx, year, req)
	if err != nil {
		return nil, err
	}
	return PatchApiV1BudgetsYear200Response{}, nil
}

func (s *Server) GetApiV1BudgetsYearReserveMovements(ctx context.Context, request GetApiV1BudgetsYearReserveMovementsRequestObject) (GetApiV1BudgetsYearReserveMovementsResponseObject, error) {
	year, err := strconv.Atoi(request.Year)
	if err != nil {
		return nil, err
	}
	b, err := s.BudgetSvc.GetByYear(ctx, year)
	if err != nil {
		return nil, err
	}
	movs, err := s.ReserveSvc.GetByBudgetID(ctx, b.ID)
	if err != nil {
		return nil, err
	}
	res := make([]ReserveMovement, 0, len(movs))
	for _, m := range movs {
		res = append(res, mapReserveMovement(m))
	}
	return GetApiV1BudgetsYearReserveMovements200JSONResponse(res), nil
}

func (s *Server) GetApiV1BudgetsYearSummary(ctx context.Context, request GetApiV1BudgetsYearSummaryRequestObject) (GetApiV1BudgetsYearSummaryResponseObject, error) {
	year, err := strconv.Atoi(request.Year)
	if err != nil {
		return nil, err
	}
	summary, err := s.BudgetSvc.GetSummary(ctx, year)
	if err != nil {
		return nil, err
	}

	return mapBudgetSummary(*summary), nil
}

// 2. Costs
func (s *Server) PostApiV1Costs(ctx context.Context, request PostApiV1CostsRequestObject) (PostApiV1CostsResponseObject, error) {
	req := cost.CreateCostRequest{
		BudgetID: request.Body.BudgetId,
		Name:     request.Body.Name,
	}
	c, err := s.CostSvc.Create(ctx, req)
	if err != nil {
		return nil, err
	}
	return PostApiV1Costs201JSONResponse(mapCost(*c)), nil
}

func (s *Server) GetApiV1CostsId(ctx context.Context, request GetApiV1CostsIdRequestObject) (GetApiV1CostsIdResponseObject, error) {
	c, err := s.CostSvc.GetByID(ctx, request.Id)
	if err != nil {
		return nil, err
	}
	return GetApiV1CostsId200JSONResponse(mapCostWithItems(*c)), nil
}

func (s *Server) PatchApiV1CostsId(ctx context.Context, request PatchApiV1CostsIdRequestObject) (PatchApiV1CostsIdResponseObject, error) {
	req := cost.PatchCostRequest{}
	if request.Body.Name != nil {
		req.Name = request.Body.Name
	}
	_, err := s.CostSvc.Patch(ctx, request.Id, req)
	if err != nil {
		return nil, err
	}
	return PatchApiV1CostsId200Response{}, nil
}

func (s *Server) DeleteApiV1CostsId(ctx context.Context, request DeleteApiV1CostsIdRequestObject) (DeleteApiV1CostsIdResponseObject, error) {
	err := s.CostSvc.Delete(ctx, request.Id)
	if err != nil {
		return nil, err
	}
	return DeleteApiV1CostsId204Response{}, nil
}

// 3. Cost Items
func (s *Server) GetApiV1CostsCostIdItems(ctx context.Context, request GetApiV1CostsCostIdItemsRequestObject) (GetApiV1CostsCostIdItemsResponseObject, error) {
	items, err := s.CostItemSvc.GetByCostID(ctx, request.CostId)
	if err != nil {
		return nil, err
	}
	res := make([]CostItem, 0, len(items))
	for _, i := range items {
		res = append(res, mapCostItem(i))
	}
	return GetApiV1CostsCostIdItems200JSONResponse(res), nil
}

func (s *Server) PostApiV1CostsCostIdItems(ctx context.Context, request PostApiV1CostsCostIdItemsRequestObject) (PostApiV1CostsCostIdItemsResponseObject, error) {
	req := costitem.CreateCostItemRequest{
		Month: request.Body.Month,
	}
	v3 := float64(request.Body.PlannedAmount)
	req.PlannedAmount = v3
	ci, err := s.CostItemSvc.Create(ctx, request.CostId, &req)
	if err != nil {
		return nil, err
	}
	return PostApiV1CostsCostIdItems201JSONResponse(mapCostItem(*ci)), nil
}

func (s *Server) DeleteApiV1CostsCostIdItemsId(ctx context.Context, request DeleteApiV1CostsCostIdItemsIdRequestObject) (DeleteApiV1CostsCostIdItemsIdResponseObject, error) {
	err := s.CostItemSvc.Delete(ctx, request.CostId, request.Id)
	if err != nil {
		return nil, err
	}
	return DeleteApiV1CostsCostIdItemsId204Response{}, nil
}

func (s *Server) PatchApiV1CostsCostIdItemsId(ctx context.Context, request PatchApiV1CostsCostIdItemsIdRequestObject) (PatchApiV1CostsCostIdItemsIdResponseObject, error) {
	req := costitem.PatchCostItemRequest{}
	if request.Body.PlannedAmount != nil {
		v := float64(*request.Body.PlannedAmount)
		req.PlannedAmount = &v
	}
	ci, err := s.CostItemSvc.Update(ctx, request.CostId, request.Id, &req)
	if err != nil {
		return nil, err
	}
	return PatchApiV1CostsCostIdItemsId200JSONResponse(mapCostItem(*ci)), nil
}

func (s *Server) PostApiV1CostsCostIdItemsIdConfirm(ctx context.Context, request PostApiV1CostsCostIdItemsIdConfirmRequestObject) (PostApiV1CostsCostIdItemsIdConfirmResponseObject, error) {
	req := costitem.ConfirmCostItemRequest{}
	v4 := float64(request.Body.ActualAmount)
	req.ActualAmount = &v4
	ci, err := s.CostItemSvc.Confirm(ctx, request.CostId, request.Id, &req)
	if err != nil {
		return nil, err
	}
	return PostApiV1CostsCostIdItemsIdConfirm200JSONResponse(mapCostItem(*ci)), nil
}

func (s *Server) DeleteApiV1CostsCostIdItemsIdConfirm(ctx context.Context, request DeleteApiV1CostsCostIdItemsIdConfirmRequestObject) (DeleteApiV1CostsCostIdItemsIdConfirmResponseObject, error) {
	ci, err := s.CostItemSvc.Unconfirm(ctx, request.CostId, request.Id)
	if err != nil {
		return nil, err
	}
	return DeleteApiV1CostsCostIdItemsIdConfirm200JSONResponse(mapCostItem(*ci)), nil
}

// 4. Entries
func (s *Server) PatchApiV1EntriesId(ctx context.Context, request PatchApiV1EntriesIdRequestObject) (PatchApiV1EntriesIdResponseObject, error) {
	req := entry.PatchEntryRequest{}
	if request.Body.PlannedAmount != nil {
		v := float64(*request.Body.PlannedAmount)
		req.PlannedAmount = &v
	}
	_, err := s.EntrySvc.Update(ctx, request.Id, &req)
	if err != nil {
		return nil, err
	}
	return PatchApiV1EntriesId200Response{}, nil
}

func (s *Server) PostApiV1EntriesIdConfirm(ctx context.Context, request PostApiV1EntriesIdConfirmRequestObject) (PostApiV1EntriesIdConfirmResponseObject, error) {
	req := entry.ConfirmEntryRequest{}
	v4 := float64(request.Body.ActualAmount)
	req.ActualAmount = &v4
	e, err := s.EntrySvc.Confirm(ctx, request.Id, &req)
	if err != nil {
		return nil, err
	}
	return PostApiV1EntriesIdConfirm200JSONResponse(mapEntry(*e)), nil
}

func (s *Server) DeleteApiV1EntriesIdConfirm(ctx context.Context, request DeleteApiV1EntriesIdConfirmRequestObject) (DeleteApiV1EntriesIdConfirmResponseObject, error) {
	e, err := s.EntrySvc.Unconfirm(ctx, request.Id)
	if err != nil {
		return nil, err
	}
	return DeleteApiV1EntriesIdConfirm200JSONResponse(mapEntry(*e)), nil
}

// 5. Goals
func (s *Server) GetApiV1Goals(ctx context.Context, request GetApiV1GoalsRequestObject) (GetApiV1GoalsResponseObject, error) {
	goals, err := s.GoalSvc.GetAll(ctx)
	if err != nil {
		return nil, err
	}
	res := make([]Goal, 0, len(goals))
	for _, g := range goals {
		res = append(res, mapGoal(g))
	}
	return GetApiV1Goals200JSONResponse(res), nil
}

func (s *Server) PostApiV1Goals(ctx context.Context, request PostApiV1GoalsRequestObject) (PostApiV1GoalsResponseObject, error) {
	req := goal.CreateGoalRequest{
		Name: request.Body.Name,
	}
	req.TargetAmount = float64(request.Body.TargetAmount)
	
	g, err := s.GoalSvc.Create(ctx, req)
	if err != nil {
		return nil, err
	}
	return PostApiV1Goals201JSONResponse(mapGoal(*g)), nil
}

func (s *Server) PatchApiV1GoalsId(ctx context.Context, request PatchApiV1GoalsIdRequestObject) (PatchApiV1GoalsIdResponseObject, error) {
	req := goal.PatchGoalRequest{}
	if request.Body.Name != nil {
		req.Name = request.Body.Name
	}
	if request.Body.Status != nil {
		v := string(*request.Body.Status)
		req.Status = &v
	}
	_, err := s.GoalSvc.Patch(ctx, request.Id, req)
	if err != nil {
		return nil, err
	}
	return PatchApiV1GoalsId200JSONResponse{}, nil // Actually let's check if it returns JSON or not later
}

func (s *Server) DeleteApiV1GoalsId(ctx context.Context, request DeleteApiV1GoalsIdRequestObject) (DeleteApiV1GoalsIdResponseObject, error) {
	err := s.GoalSvc.Delete(ctx, request.Id)
	if err != nil {
		return nil, err
	}
	return DeleteApiV1GoalsId204Response{}, nil
}

func (s *Server) PostApiV1GoalsIdContributions(ctx context.Context, request PostApiV1GoalsIdContributionsRequestObject) (PostApiV1GoalsIdContributionsResponseObject, error) {
	req := goal.CreateContributionRequest{}
	req.Amount = float64(request.Body.Amount)
	if request.Body.Note != nil {
		req.Note = request.Body.Note
	}
	g, err := s.GoalSvc.AddContribution(ctx, request.Id, req)
	if err != nil {
		return nil, err
	}
	return PostApiV1GoalsIdContributions201JSONResponse(mapGoal(*g)), nil
}

func (s *Server) DeleteApiV1GoalsIdContributionsContributionId(ctx context.Context, request DeleteApiV1GoalsIdContributionsContributionIdRequestObject) (DeleteApiV1GoalsIdContributionsContributionIdResponseObject, error) {
	g, err := s.GoalSvc.DeleteContribution(ctx, request.Id, request.ContributionId)
	if err != nil {
		return nil, err
	}
	return DeleteApiV1GoalsIdContributionsContributionId204JSONResponse(mapGoal(*g)), nil
}

// 6. Items
func (s *Server) PostApiV1Items(ctx context.Context, request PostApiV1ItemsRequestObject) (PostApiV1ItemsResponseObject, error) {
	req := item.CreateItemRequest{
		BudgetID: request.Body.BudgetId,
		Name:     request.Body.Name,
		Type:     string(request.Body.Type),
	}
	i, err := s.ItemSvc.Create(ctx, req)
	if err != nil {
		return nil, err
	}
	return PostApiV1Items201JSONResponse(mapItemWithEntries(*i)), nil
}

func (s *Server) PatchApiV1ItemsId(ctx context.Context, request PatchApiV1ItemsIdRequestObject) (PatchApiV1ItemsIdResponseObject, error) {
	req := item.PatchItemRequest{}
	if request.Body.Name != nil {
		req.Name = request.Body.Name
	}
	
	_, err := s.ItemSvc.Patch(ctx, request.Id, req)
	if err != nil {
		return nil, err
	}
	return PatchApiV1ItemsId200Response{}, nil
}

func (s *Server) DeleteApiV1ItemsId(ctx context.Context, request DeleteApiV1ItemsIdRequestObject) (DeleteApiV1ItemsIdResponseObject, error) {
	err := s.ItemSvc.Delete(ctx, request.Id)
	if err != nil {
		return nil, err
	}
	return DeleteApiV1ItemsId204Response{}, nil
}

// 7. Reserve Movements
func (s *Server) PostApiV1ReserveMovements(ctx context.Context, request PostApiV1ReserveMovementsRequestObject) (PostApiV1ReserveMovementsResponseObject, error) {
	req := reserve.CreateReserveMovementRequest{
		BudgetID: request.Body.BudgetId,
		Month:    request.Body.Month,
		Amount:   float64(request.Body.Amount),
	}
	if request.Body.Reason != nil {
		req.Reason = request.Body.Reason
	}
	rm, err := s.ReserveSvc.Create(ctx, req)
	if err != nil {
		return nil, err
	}
	return PostApiV1ReserveMovements201JSONResponse(mapReserveMovement(*rm)), nil
}

// 8. Health
func (s *Server) GetApiV1Health(ctx context.Context, request GetApiV1HealthRequestObject) (GetApiV1HealthResponseObject, error) {
	return GetApiV1Health200JSONResponse{Status: "ok"}, nil
}
