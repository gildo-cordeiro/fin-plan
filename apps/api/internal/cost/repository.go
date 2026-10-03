package cost

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"

	costitem "github.com/gildo-cordeiro/fin-plan/apps/api/internal/costitem"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrCostNotFound = errors.New("custo pontual não encontrado")
)

type Repository interface {
	GetByID(ctx context.Context, id string) (*Cost, error)
	GetByBudgetID(ctx context.Context, budgetID string) ([]Cost, error)
	Create(ctx context.Context, req CreateCostRequest) (*Cost, error)
	Patch(ctx context.Context, id string, req PatchCostRequest) (*Cost, error)
	Delete(ctx context.Context, id string) error
}

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) GetByID(ctx context.Context, id string) (*Cost, error) {
	queryCost := `
		SELECT id, budget_id, name, default_month, margin_percent, notes
		FROM cost
		WHERE id = $1
	`

	var c Cost
	err := r.pool.QueryRow(ctx, queryCost, id).Scan(
		&c.ID,
		&c.BudgetID,
		&c.Name,
		&c.DefaultMonth,
		&c.MarginPercent,
		&c.Notes,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCostNotFound
		}
		return nil, fmt.Errorf("erro ao buscar custo: %w", err)
	}

	// Buscar itens
	queryItems := `
		SELECT id, cost_id, name, planned_amount, actual_amount, month,
		       to_char(due_date, 'YYYY-MM-DD'), to_char(paid_date, 'YYYY-MM-DD')
		FROM cost_item
		WHERE cost_id = $1
		ORDER BY month NULLS LAST, name
	`
	rows, err := r.pool.Query(ctx, queryItems, id)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar itens do custo: %w", err)
	}
	defer rows.Close()

	c.Items = make([]costitem.CostItem, 0)
	for rows.Next() {
		var it costitem.CostItem
		if err := rows.Scan(
			&it.ID,
			&it.CostID,
			&it.Name,
			&it.PlannedAmount,
			&it.ActualAmount,
			&it.Month,
			&it.DueDate,
			&it.PaidDate,
		); err != nil {
			return nil, fmt.Errorf("erro ao escanear item do custo: %w", err)
		}
		c.Items = append(c.Items, it)
	}

	c.CalculateTotals()

	return &c, nil
}

func (r *PostgresRepository) GetByBudgetID(ctx context.Context, budgetID string) ([]Cost, error) {
	queryCosts := `
		SELECT id, budget_id, name, default_month, margin_percent, notes
		FROM cost
		WHERE budget_id = $1
		ORDER BY default_month NULLS LAST, name
	`

	rows, err := r.pool.Query(ctx, queryCosts, budgetID)
	if err != nil {
		return nil, fmt.Errorf("erro ao listar custos do orçamento: %w", err)
	}
	defer rows.Close()

	costs := make([]Cost, 0)
	costMap := make(map[string]*Cost)

	for rows.Next() {
		var c Cost
		if err := rows.Scan(
			&c.ID,
			&c.BudgetID,
			&c.Name,
			&c.DefaultMonth,
			&c.MarginPercent,
			&c.Notes,
		); err != nil {
			return nil, fmt.Errorf("erro ao escanear custo: %w", err)
		}
		c.Items = make([]costitem.CostItem, 0)
		costs = append(costs, c)
	}

	if len(costs) == 0 {
		return costs, nil
	}

	for i := range costs {
		costMap[costs[i].ID] = &costs[i]
	}

	// Buscar todos os itens para os custos encontrados
	queryItems := `
		SELECT ci.id, ci.cost_id, ci.name, ci.planned_amount, ci.actual_amount, ci.month,
		       to_char(ci.due_date, 'YYYY-MM-DD'), to_char(ci.paid_date, 'YYYY-MM-DD')
		FROM cost_item ci
		JOIN cost c ON ci.cost_id = c.id
		WHERE c.budget_id = $1
		ORDER BY ci.month NULLS LAST, ci.name
	`
	itemRows, err := r.pool.Query(ctx, queryItems, budgetID)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar itens dos custos: %w", err)
	}
	defer itemRows.Close()

	for itemRows.Next() {
		var it costitem.CostItem
		if err := itemRows.Scan(
			&it.ID,
			&it.CostID,
			&it.Name,
			&it.PlannedAmount,
			&it.ActualAmount,
			&it.Month,
			&it.DueDate,
			&it.PaidDate,
		); err != nil {
			return nil, fmt.Errorf("erro ao escanear item de custo: %w", err)
		}
		if parent, ok := costMap[it.CostID]; ok {
			parent.Items = append(parent.Items, it)
		}
	}

	return costs, nil
}

func (r *PostgresRepository) Create(ctx context.Context, req CreateCostRequest) (*Cost, error) {
	query := `
		INSERT INTO cost (budget_id, name, default_month, margin_percent, notes)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, budget_id, name, default_month, margin_percent, notes
	`

	var c Cost
	err := r.pool.QueryRow(ctx, query,
		req.BudgetID,
		req.Name,
		req.DefaultMonth,
		req.MarginPercent,
		req.Notes,
	).Scan(
		&c.ID,
		&c.BudgetID,
		&c.Name,
		&c.DefaultMonth,
		&c.MarginPercent,
		&c.Notes,
	)
	if err != nil {
		return nil, fmt.Errorf("erro ao criar custo: %w", err)
	}

	c.Items = make([]costitem.CostItem, 0)
	c.TotalPlanned = 0
	c.TotalWithMargin = 0

	return &c, nil
}

func (r *PostgresRepository) Patch(ctx context.Context, id string, req PatchCostRequest) (*Cost, error) {
	setClauses := make([]string, 0)
	args := make([]interface{}, 0)
	argID := 1

	if req.Name != nil {
		setClauses = append(setClauses, "name = $"+strconv.Itoa(argID))
		args = append(args, *req.Name)
		argID++
	}
	if req.DefaultMonth != nil {
		if *req.DefaultMonth == 0 {
			setClauses = append(setClauses, "default_month = NULL")
		} else {
			setClauses = append(setClauses, "default_month = $"+strconv.Itoa(argID))
			args = append(args, *req.DefaultMonth)
			argID++
		}
	}
	if req.MarginPercent != nil {
		setClauses = append(setClauses, "margin_percent = $"+strconv.Itoa(argID))
		args = append(args, *req.MarginPercent)
		argID++
	}
	if req.Notes != nil {
		setClauses = append(setClauses, "notes = $"+strconv.Itoa(argID))
		args = append(args, *req.Notes)
		argID++
	}

	if len(setClauses) > 0 {
		args = append(args, id)
		query := fmt.Sprintf("UPDATE cost SET %s WHERE id = $%d", strings.Join(setClauses, ", "), argID)
		cmdTag, err := r.pool.Exec(ctx, query, args...)
		if err != nil {
			return nil, fmt.Errorf("erro ao atualizar custo: %w", err)
		}
		if cmdTag.RowsAffected() == 0 {
			return nil, ErrCostNotFound
		}
	}

	return r.GetByID(ctx, id)
}

func (r *PostgresRepository) Delete(ctx context.Context, id string) error {
	cmdTag, err := r.pool.Exec(ctx, "DELETE FROM cost WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("erro ao excluir custo: %w", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return ErrCostNotFound
	}
	return nil
}
