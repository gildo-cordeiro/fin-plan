package entry

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrEntryNotFound = errors.New("lançamento não encontrado")

type Repository interface {
	GetByID(ctx context.Context, id string) (*Entry, error)
	GetByItemID(ctx context.Context, itemID string) ([]Entry, error)
	Update(ctx context.Context, id string, req *PatchEntryRequest) (*Entry, error)
	CreateBatch(ctx context.Context, entries []Entry) error
}

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) GetByID(ctx context.Context, id string) (*Entry, error) {
	query := `
		SELECT id, item_id, month, planned_amount, actual_amount,
		       to_char(due_date, 'YYYY-MM-DD'),
		       to_char(paid_date, 'YYYY-MM-DD')
		FROM entry
		WHERE id = $1
	`
	var e Entry
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&e.ID, &e.ItemID, &e.Month, &e.PlannedAmount, &e.ActualAmount,
		&e.DueDate, &e.PaidDate,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrEntryNotFound
		}
		return nil, fmt.Errorf("falha ao buscar entry: %w", err)
	}
	return &e, nil
}

func (r *PostgresRepository) GetByItemID(ctx context.Context, itemID string) ([]Entry, error) {
	query := `
		SELECT id, item_id, month, planned_amount, actual_amount,
		       to_char(due_date, 'YYYY-MM-DD'),
		       to_char(paid_date, 'YYYY-MM-DD')
		FROM entry
		WHERE item_id = $1
		ORDER BY month ASC
	`
	rows, err := r.pool.Query(ctx, query, itemID)
	if err != nil {
		return nil, fmt.Errorf("falha ao listar entries do item: %w", err)
	}
	defer rows.Close()

	var entries []Entry
	for rows.Next() {
		var e Entry
		if err := rows.Scan(
			&e.ID, &e.ItemID, &e.Month, &e.PlannedAmount, &e.ActualAmount,
			&e.DueDate, &e.PaidDate,
		); err != nil {
			return nil, fmt.Errorf("falha ao ler linha de entry: %w", err)
		}
		entries = append(entries, e)
	}
	return entries, nil
}

func (r *PostgresRepository) Update(ctx context.Context, id string, req *PatchEntryRequest) (*Entry, error) {
	setClauses := []string{}
	args := []any{}
	argIdx := 1

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

	args = append(args, id)
	query := fmt.Sprintf(`
		UPDATE entry
		SET %s
		WHERE id = $%d
		RETURNING id, item_id, month, planned_amount, actual_amount,
		          to_char(due_date, 'YYYY-MM-DD'),
		          to_char(paid_date, 'YYYY-MM-DD')
	`, strings.Join(setClauses, ", "), argIdx)

	var e Entry
	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&e.ID, &e.ItemID, &e.Month, &e.PlannedAmount, &e.ActualAmount,
		&e.DueDate, &e.PaidDate,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrEntryNotFound
		}
		return nil, fmt.Errorf("falha ao atualizar entry: %w", err)
	}
	return &e, nil
}

func (r *PostgresRepository) CreateBatch(ctx context.Context, entries []Entry) error {
	if len(entries) == 0 {
		return nil
	}

	query := `
		INSERT INTO entry (item_id, month, planned_amount, actual_amount, due_date, paid_date)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	batch := &pgx.Batch{}
	for _, e := range entries {
		batch.Queue(query, e.ItemID, e.Month, e.PlannedAmount, e.ActualAmount, e.DueDate, e.PaidDate)
	}

	br := r.pool.SendBatch(ctx, batch)
	defer br.Close()

	for range entries {
		if _, err := br.Exec(); err != nil {
			return fmt.Errorf("falha ao inserir batch de entries: %w", err)
		}
	}
	return nil
}


