package costitem

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrCostItemNotFound = errors.New("item de custo não encontrado")

type Repository interface {
	Create(ctx context.Context, costID string, req *CreateCostItemRequest) (*CostItem, error)
	GetByID(ctx context.Context, id string) (*CostItem, error)
	GetByCostID(ctx context.Context, costID string) ([]CostItem, error)
	Update(ctx context.Context, costID, id string, req *PatchCostItemRequest) (*CostItem, error)
	Delete(ctx context.Context, costID, id string) error
}

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) Create(ctx context.Context, costID string, req *CreateCostItemRequest) (*CostItem, error) {
	query := `
		INSERT INTO cost_item (cost_id, name, planned_amount, actual_amount, month, due_date, paid_date)
		VALUES ($1, $2, $3, $4, $5, $6::date, $7::date)
		RETURNING id, cost_id, name, planned_amount, actual_amount, month,
		          to_char(due_date, 'YYYY-MM-DD'),
		          to_char(paid_date, 'YYYY-MM-DD')
	`
	var item CostItem
	err := r.pool.QueryRow(ctx, query, costID, req.Name, req.PlannedAmount, req.ActualAmount, req.Month, req.DueDate, req.PaidDate).Scan(
		&item.ID, &item.CostID, &item.Name, &item.PlannedAmount, &item.ActualAmount, &item.Month,
		&item.DueDate, &item.PaidDate,
	)
	if err != nil {
		return nil, fmt.Errorf("falha ao criar cost_item: %w", err)
	}
	return &item, nil
}

func (r *PostgresRepository) GetByID(ctx context.Context, id string) (*CostItem, error) {
	query := `
		SELECT id, cost_id, name, planned_amount, actual_amount, month,
		       to_char(due_date, 'YYYY-MM-DD'),
		       to_char(paid_date, 'YYYY-MM-DD')
		FROM cost_item
		WHERE id = $1
	`
	var item CostItem
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&item.ID, &item.CostID, &item.Name, &item.PlannedAmount, &item.ActualAmount, &item.Month,
		&item.DueDate, &item.PaidDate,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCostItemNotFound
		}
		return nil, fmt.Errorf("falha ao buscar cost_item: %w", err)
	}
	return &item, nil
}

func (r *PostgresRepository) GetByCostID(ctx context.Context, costID string) ([]CostItem, error) {
	query := `
		SELECT id, cost_id, name, planned_amount, actual_amount, month,
		       to_char(due_date, 'YYYY-MM-DD'),
		       to_char(paid_date, 'YYYY-MM-DD')
		FROM cost_item
		WHERE cost_id = $1
		ORDER BY id ASC
	`
	rows, err := r.pool.Query(ctx, query, costID)
	if err != nil {
		return nil, fmt.Errorf("falha ao listar itens do custo: %w", err)
	}
	defer rows.Close()

	var items []CostItem
	for rows.Next() {
		var item CostItem
		if err := rows.Scan(
			&item.ID, &item.CostID, &item.Name, &item.PlannedAmount, &item.ActualAmount, &item.Month,
			&item.DueDate, &item.PaidDate,
		); err != nil {
			return nil, fmt.Errorf("falha ao ler linha de cost_item: %w", err)
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *PostgresRepository) Update(ctx context.Context, costID, id string, req *PatchCostItemRequest) (*CostItem, error) {
	setClauses := []string{}
	args := []any{}
	argIdx := 1

	if req.Name != nil {
		setClauses = append(setClauses, fmt.Sprintf("name = $%d", argIdx))
		args = append(args, *req.Name)
		argIdx++
	}
	if req.PlannedAmount != nil {
		setClauses = append(setClauses, fmt.Sprintf("planned_amount = $%d", argIdx))
		args = append(args, *req.PlannedAmount)
		argIdx++
	}
	if req.ActualAmount != nil {
		if *req.ActualAmount < 0 {
			setClauses = append(setClauses, "actual_amount = NULL")
		} else {
			setClauses = append(setClauses, fmt.Sprintf("actual_amount = $%d", argIdx))
			args = append(args, *req.ActualAmount)
			argIdx++
		}
	}
	if req.Month != nil {
		if *req.Month == 0 {
			setClauses = append(setClauses, "month = NULL")
		} else {
			setClauses = append(setClauses, fmt.Sprintf("month = $%d", argIdx))
			args = append(args, *req.Month)
			argIdx++
		}
	}
	if req.DueDate != nil {
		if *req.DueDate == "" {
			setClauses = append(setClauses, "due_date = NULL")
		} else {
			setClauses = append(setClauses, fmt.Sprintf("due_date = $%d::date", argIdx))
			args = append(args, *req.DueDate)
			argIdx++
		}
	}
	if req.PaidDate != nil {
		if *req.PaidDate == "" {
			setClauses = append(setClauses, "paid_date = NULL")
		} else {
			setClauses = append(setClauses, fmt.Sprintf("paid_date = $%d::date", argIdx))
			args = append(args, *req.PaidDate)
			argIdx++
		}
	}

	if len(setClauses) == 0 {
		return r.GetByID(ctx, id)
	}

	args = append(args, costID, id)
	query := fmt.Sprintf(`
		UPDATE cost_item
		SET %s
		WHERE cost_id = $%d AND id = $%d
		RETURNING id, cost_id, name, planned_amount, actual_amount, month,
		          to_char(due_date, 'YYYY-MM-DD'),
		          to_char(paid_date, 'YYYY-MM-DD')
	`, strings.Join(setClauses, ", "), argIdx, argIdx+1)

	var item CostItem
	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&item.ID, &item.CostID, &item.Name, &item.PlannedAmount, &item.ActualAmount, &item.Month,
		&item.DueDate, &item.PaidDate,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCostItemNotFound
		}
		return nil, fmt.Errorf("falha ao atualizar cost_item: %w", err)
	}
	return &item, nil
}

func (r *PostgresRepository) Delete(ctx context.Context, costID, id string) error {
	query := `DELETE FROM cost_item WHERE cost_id = $1 AND id = $2`
	tag, err := r.pool.Exec(ctx, query, costID, id)
	if err != nil {
		return fmt.Errorf("falha ao excluir cost_item: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrCostItemNotFound
	}
	return nil
}
