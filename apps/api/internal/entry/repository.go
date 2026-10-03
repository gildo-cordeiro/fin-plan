package entry

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	GetByID(ctx context.Context, id string) (*Entry, error)
	GetByItemID(ctx context.Context, itemID string) ([]Entry, error)
	Update(ctx context.Context, id string, req *PatchEntryRequest) (*Entry, error)
	Confirm(ctx context.Context, id string, req *ConfirmEntryRequest) (*Entry, error)
	Unconfirm(ctx context.Context, id string) (*Entry, error)
	CreateBatch(ctx context.Context, entries []Entry) error
}

var ErrEntryNotFound = errors.New("lançamento orçamentário não encontrado")

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
	if req.DueDate != nil {
		if *req.DueDate == "" {
			setClauses = append(setClauses, "due_date = NULL")
		} else {
			setClauses = append(setClauses, fmt.Sprintf("due_date = $%d::date", argIdx))
			args = append(args, *req.DueDate)
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

	return r.scanOne(ctx, "falha ao atualizar entry", query, args...)
}

// Confirm marca a entry como paga. Valores ausentes usam planned_amount e a data atual.
func (r *PostgresRepository) Confirm(ctx context.Context, id string, req *ConfirmEntryRequest) (*Entry, error) {
	query := `
		UPDATE entry
		SET actual_amount = COALESCE($1, planned_amount),
		    paid_date     = COALESCE($2::date, CURRENT_DATE)
		WHERE id = $3
		RETURNING id, item_id, month, planned_amount, actual_amount,
		          to_char(due_date, 'YYYY-MM-DD'),
		          to_char(paid_date, 'YYYY-MM-DD')
	`
	return r.scanOne(ctx, "falha ao confirmar entry", query, req.ActualAmount, req.PaidDate, id)
}

// Unconfirm desfaz a confirmação, limpando valor realizado e data de pagamento.
func (r *PostgresRepository) Unconfirm(ctx context.Context, id string) (*Entry, error) {
	query := `
		UPDATE entry
		SET actual_amount = NULL,
		    paid_date     = NULL
		WHERE id = $1
		RETURNING id, item_id, month, planned_amount, actual_amount,
		          to_char(due_date, 'YYYY-MM-DD'),
		          to_char(paid_date, 'YYYY-MM-DD')
	`
	return r.scanOne(ctx, "falha ao desconfirmar entry", query, id)
}

func (r *PostgresRepository) scanOne(ctx context.Context, errMsg, query string, args ...any) (*Entry, error) {
	var e Entry
	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&e.ID, &e.ItemID, &e.Month, &e.PlannedAmount, &e.ActualAmount,
		&e.DueDate, &e.PaidDate,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrEntryNotFound
		}
		return nil, fmt.Errorf("%s: %w", errMsg, err)
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
