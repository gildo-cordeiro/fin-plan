package reserve

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	Create(ctx context.Context, req CreateReserveMovementRequest) (*ReserveMovement, error)
	GetByBudgetID(ctx context.Context, budgetID string) ([]ReserveMovement, error)
}

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) Create(ctx context.Context, req CreateReserveMovementRequest) (*ReserveMovement, error) {
	query := `
		INSERT INTO reserve_movement (budget_id, month, amount, reason)
		VALUES ($1, $2, $3, $4)
		RETURNING id, budget_id, month, amount, reason
	`

	var rm ReserveMovement
	err := r.pool.QueryRow(ctx, query, req.BudgetID, req.Month, req.Amount, req.Reason).Scan(
		&rm.ID,
		&rm.BudgetID,
		&rm.Month,
		&rm.Amount,
		&rm.Reason,
	)
	if err != nil {
		return nil, fmt.Errorf("erro ao registrar movimentação de reserva: %w", err)
	}

	return &rm, nil
}

func (r *PostgresRepository) GetByBudgetID(ctx context.Context, budgetID string) ([]ReserveMovement, error) {
	query := `
		SELECT id, budget_id, month, amount, reason
		FROM reserve_movement
		WHERE budget_id = $1
		ORDER BY month ASC, id ASC
	`

	rows, err := r.pool.Query(ctx, query, budgetID)
	if err != nil {
		return nil, fmt.Errorf("erro ao listar movimentações de reserva: %w", err)
	}
	defer rows.Close()

	movements := make([]ReserveMovement, 0)
	for rows.Next() {
		var rm ReserveMovement
		if err := rows.Scan(
			&rm.ID,
			&rm.BudgetID,
			&rm.Month,
			&rm.Amount,
			&rm.Reason,
		); err != nil {
			return nil, fmt.Errorf("erro ao escanear movimentação de reserva: %w", err)
		}
		movements = append(movements, rm)
	}

	return movements, nil
}
