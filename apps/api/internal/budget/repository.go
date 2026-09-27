package budget

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrBudgetNotFound = errors.New("orçamento não encontrado")
)

type Repository interface {
	GetAll(ctx context.Context) ([]Budget, error)
	GetByYear(ctx context.Context, year int) (*Budget, error)
	Create(ctx context.Context, req CreateBudgetRequest) (*Budget, error)
	Patch(ctx context.Context, year int, req PatchBudgetRequest) (*Budget, error)
	GetSummary(ctx context.Context, year int) (*BudgetSummary, error)
}

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) GetAll(ctx context.Context) ([]Budget, error) {
	query := `
		SELECT id, year, initial_balance, emergency_reserve_target, reconciled_month, reconciled_balance, created_at, updated_at
		FROM budget
		ORDER BY year DESC
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("erro ao listar orçamentos: %w", err)
	}
	defer rows.Close()

	budgets := make([]Budget, 0)
	for rows.Next() {
		var b Budget
		if err := rows.Scan(
			&b.ID,
			&b.Year,
			&b.InitialBalance,
			&b.EmergencyReserveTarget,
			&b.ReconciledMonth,
			&b.ReconciledBalance,
			&b.CreatedAt,
			&b.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("erro ao escanear orçamento: %w", err)
		}
		budgets = append(budgets, b)
	}

	return budgets, nil
}

func (r *PostgresRepository) GetByYear(ctx context.Context, year int) (*Budget, error) {
	query := `
		SELECT id, year, initial_balance, emergency_reserve_target, reconciled_month, reconciled_balance, created_at, updated_at
		FROM budget
		WHERE year = $1
	`
	var b Budget
	err := r.pool.QueryRow(ctx, query, year).Scan(
		&b.ID,
		&b.Year,
		&b.InitialBalance,
		&b.EmergencyReserveTarget,
		&b.ReconciledMonth,
		&b.ReconciledBalance,
		&b.CreatedAt,
		&b.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrBudgetNotFound
		}
		return nil, fmt.Errorf("erro ao buscar orçamento: %w", err)
	}

	return &b, nil
}

func (r *PostgresRepository) Create(ctx context.Context, req CreateBudgetRequest) (*Budget, error) {
	id := strconv.Itoa(req.Year)
	initBal := 0.0
	if req.InitialBalance != nil {
		initBal = *req.InitialBalance
	}
	reserveTarget := 0.0
	if req.EmergencyReserveTarget != nil {
		reserveTarget = *req.EmergencyReserveTarget
	}

	query := `
		INSERT INTO budget (id, year, initial_balance, emergency_reserve_target, reconciled_month, reconciled_balance)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, year, initial_balance, emergency_reserve_target, reconciled_month, reconciled_balance, created_at, updated_at
	`
	var b Budget
	err := r.pool.QueryRow(ctx, query, id, req.Year, initBal, reserveTarget, req.ReconciledMonth, req.ReconciledBalance).Scan(
		&b.ID,
		&b.Year,
		&b.InitialBalance,
		&b.EmergencyReserveTarget,
		&b.ReconciledMonth,
		&b.ReconciledBalance,
		&b.CreatedAt,
		&b.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("erro ao criar orçamento: %w", err)
	}

	return &b, nil
}

func (r *PostgresRepository) Patch(ctx context.Context, year int, req PatchBudgetRequest) (*Budget, error) {
	setClauses := make([]string, 0)
	args := make([]interface{}, 0)
	argID := 1

	if req.InitialBalance != nil {
		setClauses = append(setClauses, "initial_balance = $"+strconv.Itoa(argID))
		args = append(args, *req.InitialBalance)
		argID++
	}
	if req.EmergencyReserveTarget != nil {
		setClauses = append(setClauses, "emergency_reserve_target = $"+strconv.Itoa(argID))
		args = append(args, *req.EmergencyReserveTarget)
		argID++
	}
	if req.ReconciledMonth != nil {
		setClauses = append(setClauses, "reconciled_month = $"+strconv.Itoa(argID))
		args = append(args, *req.ReconciledMonth)
		argID++
	}
	if req.ReconciledBalance != nil {
		setClauses = append(setClauses, "reconciled_balance = $"+strconv.Itoa(argID))
		args = append(args, *req.ReconciledBalance)
		argID++
	}

	if len(setClauses) > 0 {
		setClauses = append(setClauses, "updated_at = now()")
		args = append(args, year)
		query := fmt.Sprintf("UPDATE budget SET %s WHERE year = $%d", strings.Join(setClauses, ", "), argID)
		cmdTag, err := r.pool.Exec(ctx, query, args...)
		if err != nil {
			return nil, fmt.Errorf("erro ao atualizar orçamento: %w", err)
		}
		if cmdTag.RowsAffected() == 0 {
			return nil, ErrBudgetNotFound
		}
	}

	return r.GetByYear(ctx, year)
}

func (r *PostgresRepository) GetSummary(ctx context.Context, year int) (*BudgetSummary, error) {
	b, err := r.GetByYear(ctx, year)
	if err != nil {
		return nil, err
	}

	budgetID := strconv.Itoa(year)

	// Query mensal agregando entries por tipo e cost_items com mês definido/herdado
	queryMonthly := `
		WITH months AS (
			SELECT generate_series(1, 12) AS month
		),
		entries_by_type AS (
			SELECT
				e.month,
				COALESCE(SUM(CASE WHEN i.type = 'renda' THEN e.planned_amount ELSE 0 END), 0) AS income,
				COALESCE(SUM(CASE WHEN i.type = 'cartao' THEN e.planned_amount ELSE 0 END), 0) AS cards,
				COALESCE(SUM(CASE WHEN i.type = 'fixa' THEN e.planned_amount ELSE 0 END), 0) AS fixed,
				COALESCE(SUM(CASE WHEN i.type = 'variavel' THEN e.planned_amount ELSE 0 END), 0) AS variable
			FROM entry e
			JOIN item i ON e.item_id = i.id
			WHERE i.budget_id = $1
			GROUP BY e.month
		),
		cost_items_by_month AS (
			SELECT
				COALESCE(ci.month, c.default_month) AS month,
				COALESCE(SUM(ci.planned_amount), 0) AS one_time_costs
			FROM cost_item ci
			JOIN cost c ON ci.cost_id = c.id
			WHERE c.budget_id = $1
			GROUP BY COALESCE(ci.month, c.default_month)
		)
		SELECT
			m.month,
			COALESCE(ebt.income, 0) AS income,
			COALESCE(ebt.cards, 0) AS cards,
			COALESCE(ebt.fixed, 0) AS fixed,
			COALESCE(ebt.variable, 0) AS variable,
			COALESCE(cibm.one_time_costs, 0) AS one_time_costs
		FROM months m
		LEFT JOIN entries_by_type ebt ON ebt.month = m.month
		LEFT JOIN cost_items_by_month cibm ON cibm.month = m.month
		ORDER BY m.month ASC;
	`

	rows, err := r.pool.Query(ctx, queryMonthly, budgetID)
	if err != nil {
		return nil, fmt.Errorf("erro ao calcular sumário mensal: %w", err)
	}
	defer rows.Close()

	summary := &BudgetSummary{
		Year:                   year,
		InitialBalance:         b.InitialBalance,
		EmergencyReserveTarget: b.EmergencyReserveTarget,
		ReconciledMonth:        b.ReconciledMonth,
		ReconciledBalance:      b.ReconciledBalance,
		Months:                 make([]BudgetSummaryMonth, 0, 12),
	}

	runningAccumulated := b.InitialBalance
	hasAnchor := b.ReconciledMonth != nil && b.ReconciledBalance != nil && *b.ReconciledMonth >= 1 && *b.ReconciledMonth <= 12
	anchorMonth := 0
	anchorBal := 0.0
	if hasAnchor {
		anchorMonth = *b.ReconciledMonth
		anchorBal = *b.ReconciledBalance
	}

	for rows.Next() {
		var m BudgetSummaryMonth
		if err := rows.Scan(
			&m.Month,
			&m.Income,
			&m.Cards,
			&m.Fixed,
			&m.Variable,
			&m.OneTimeCosts,
		); err != nil {
			return nil, fmt.Errorf("erro ao escanear mês do sumário: %w", err)
		}

		m.TotalExpenses = m.Cards + m.Fixed + m.Variable + m.OneTimeCosts
		m.MonthBalance = m.Income - m.TotalExpenses

		if hasAnchor {
			if m.Month < anchorMonth {
				runningAccumulated += m.MonthBalance
				m.AccumulatedBalance = runningAccumulated
			} else if m.Month == anchorMonth {
				runningAccumulated = anchorBal
				m.AccumulatedBalance = runningAccumulated
			} else {
				runningAccumulated += m.MonthBalance
				m.AccumulatedBalance = runningAccumulated
			}
		} else {
			runningAccumulated += m.MonthBalance
			m.AccumulatedBalance = runningAccumulated
		}

		summary.Months = append(summary.Months, m)

		summary.Totals.Income += m.Income
		summary.Totals.Cards += m.Cards
		summary.Totals.Fixed += m.Fixed
		summary.Totals.Variable += m.Variable
	}

	// Total geral de custos pontuais (incluindo itens sem mês em nenhum nível)
	queryTotalOneTime := `
		SELECT COALESCE(SUM(ci.planned_amount), 0)
		FROM cost_item ci
		JOIN cost c ON ci.cost_id = c.id
		WHERE c.budget_id = $1
	`
	err = r.pool.QueryRow(ctx, queryTotalOneTime, budgetID).Scan(&summary.Totals.OneTimeCosts)
	if err != nil {
		return nil, fmt.Errorf("erro ao calcular total de custos pontuais: %w", err)
	}

	summary.Totals.TotalExpenses = summary.Totals.Cards + summary.Totals.Fixed + summary.Totals.Variable + summary.Totals.OneTimeCosts
	summary.Totals.NetBalance = summary.Totals.Income - summary.Totals.TotalExpenses
	if hasAnchor {
		summary.Totals.FinalAccumulated = runningAccumulated
	} else {
		summary.Totals.FinalAccumulated = b.InitialBalance + summary.Totals.NetBalance
	}

	return summary, nil
}
