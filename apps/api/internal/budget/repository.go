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
}

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) GetAll(ctx context.Context) ([]Budget, error) {
	query := `
		SELECT id, year, initial_balance, emergency_reserve_target, emergency_reserve_initial_balance, created_at, updated_at
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
			&b.EmergencyReserveInitialBalance,
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
		SELECT id, year, initial_balance, emergency_reserve_target, emergency_reserve_initial_balance, created_at, updated_at
		FROM budget
		WHERE year = $1
	`
	var b Budget
	err := r.pool.QueryRow(ctx, query, year).Scan(
		&b.ID,
		&b.Year,
		&b.InitialBalance,
		&b.EmergencyReserveTarget,
		&b.EmergencyReserveInitialBalance,
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
	reserveInit := 0.0
	if req.EmergencyReserveInitialBalance != nil {
		reserveInit = *req.EmergencyReserveInitialBalance
	}

	query := `
		INSERT INTO budget (id, year, initial_balance, emergency_reserve_target, emergency_reserve_initial_balance)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, year, initial_balance, emergency_reserve_target, emergency_reserve_initial_balance, created_at, updated_at
	`
	var b Budget
	err := r.pool.QueryRow(ctx, query, id, req.Year, initBal, reserveTarget, reserveInit).Scan(
		&b.ID,
		&b.Year,
		&b.InitialBalance,
		&b.EmergencyReserveTarget,
		&b.EmergencyReserveInitialBalance,
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
	if req.EmergencyReserveInitialBalance != nil {
		setClauses = append(setClauses, "emergency_reserve_initial_balance = $"+strconv.Itoa(argID))
		args = append(args, *req.EmergencyReserveInitialBalance)
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
