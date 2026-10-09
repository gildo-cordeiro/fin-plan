package budget

import (
	"context"
	"errors"
	"fmt"
	"strconv"

	cost "github.com/gildo-cordeiro/fin-plan/apps/api/internal/cost"
	goal "github.com/gildo-cordeiro/fin-plan/apps/api/internal/goal"
	item "github.com/gildo-cordeiro/fin-plan/apps/api/internal/item"
	reserve "github.com/gildo-cordeiro/fin-plan/apps/api/internal/reserve"
)

type Service struct {
	repo        Repository
	itemRepo    item.Repository
	costRepo    cost.Repository
	goalRepo    goal.Repository
	reserveRepo reserve.Repository
}

func NewService(
	repo Repository,
	itemRepo item.Repository,
	costRepo cost.Repository,
	goalRepo goal.Repository,
	reserveRepo reserve.Repository,
) *Service {
	return &Service{
		repo:        repo,
		itemRepo:    itemRepo,
		costRepo:    costRepo,
		goalRepo:    goalRepo,
		reserveRepo: reserveRepo,
	}
}

func (s *Service) GetAll(ctx context.Context) ([]Budget, error) {
	return s.repo.GetAll(ctx)
}

func (s *Service) GetByYear(ctx context.Context, year int) (*Budget, error) {
	if year < 2000 || year > 2100 {
		return nil, errors.New("ano do orçamento inválido")
	}
	return s.repo.GetByYear(ctx, year)
}

func (s *Service) Create(ctx context.Context, req CreateBudgetRequest) (*Budget, error) {
	initBalance := 0.0
	if req.InitialBalance != nil {
		initBalance = *req.InitialBalance
	}
	reserveTarget := 0.0
	if req.EmergencyReserveTarget != nil {
		reserveTarget = *req.EmergencyReserveTarget
	}

	_, err := NewBudget(req.Year, initBalance, reserveTarget)
	if err != nil {
		return nil, err
	}
	return s.repo.Create(ctx, req)
}

func (s *Service) Patch(ctx context.Context, year int, req PatchBudgetRequest) (*Budget, error) {
	tempBudget := &Budget{}
	tempBudget.Update(req.InitialBalance, req.EmergencyReserveTarget, req.EmergencyReserveInitialBalance)

	return s.repo.Patch(ctx, year, req)
}

func (s *Service) GetSummary(ctx context.Context, year int) (*BudgetSummary, error) {
	if year < 2000 || year > 2100 {
		return nil, errors.New("ano do orçamento inválido")
	}
	b, err := s.repo.GetByYear(ctx, year)
	if err != nil {
		return nil, err
	}

	budgetID := strconv.Itoa(year)
	var items []item.Item
	if s.itemRepo != nil {
		items, err = s.itemRepo.GetByBudgetID(ctx, budgetID)
		if err != nil {
			return nil, fmt.Errorf("erro ao carregar itens: %w", err)
		}
	}

	var costs []cost.Cost
	if s.costRepo != nil {
		costs, err = s.costRepo.GetByBudgetID(ctx, budgetID)
		if err != nil {
			return nil, fmt.Errorf("erro ao carregar custos: %w", err)
		}
	}

	var movements []reserve.ReserveMovement
	if s.reserveRepo != nil {
		movements, err = s.reserveRepo.GetByBudgetID(ctx, budgetID)
		if err != nil {
			return nil, fmt.Errorf("erro ao carregar movimentos: %w", err)
		}
	}

	summary := b.CalculateSummary(items, costs, movements)
	return &summary, nil
}

func (s *Service) GetYearViewModel(ctx context.Context, year int) (*YearViewModel, error) {
	if year < 2000 || year > 2100 {
		return nil, errors.New("ano do orçamento inválido")
	}

	b, err := s.repo.GetByYear(ctx, year)
	if err != nil {
		return nil, err
	}

	budgetID := strconv.Itoa(year)

	var items []item.Item
	if s.itemRepo != nil {
		items, err = s.itemRepo.GetByBudgetID(ctx, budgetID)
		if err != nil {
			return nil, fmt.Errorf("erro ao carregar itens: %w", err)
		}
	} else {
		items = make([]item.Item, 0)
	}

	var costs []cost.Cost
	if s.costRepo != nil {
		costs, err = s.costRepo.GetByBudgetID(ctx, budgetID)
		if err != nil {
			return nil, fmt.Errorf("erro ao carregar custos: %w", err)
		}
	} else {
		costs = make([]cost.Cost, 0)
	}

	var goals []goal.Goal
	if s.goalRepo != nil {
		goals, err = s.goalRepo.GetAll(ctx)
		if err != nil {
			return nil, fmt.Errorf("erro ao carregar metas: %w", err)
		}
	} else {
		goals = make([]goal.Goal, 0)
	}

	var movements []reserve.ReserveMovement
	if s.reserveRepo != nil {
		movements, err = s.reserveRepo.GetByBudgetID(ctx, budgetID)
		if err != nil {
			return nil, fmt.Errorf("erro ao carregar movimentos de reserva: %w", err)
		}
	} else {
		movements = make([]reserve.ReserveMovement, 0)
	}

	return &YearViewModel{
		Budget:           *b,
		Items:            items,
		Costs:            costs,
		Goals:            goals,
		ReserveMovements: movements,
	}, nil
}
