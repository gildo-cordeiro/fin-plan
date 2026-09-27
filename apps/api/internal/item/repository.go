package item

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/entry"
)

var (
	ErrItemNotFound = errors.New("item orçamentário não encontrado")
)

type Repository interface {
	GetByID(ctx context.Context, id string) (*Item, error)
	GetByBudgetID(ctx context.Context, budgetID string) ([]Item, error)
	Create(ctx context.Context, req CreateItemRequest) (*Item, error)
	Patch(ctx context.Context, id string, req PatchItemRequest) (*Item, error)
	Delete(ctx context.Context, id string) error
}

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) Create(ctx context.Context, req CreateItemRequest) (*Item, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("erro ao iniciar transação: %w", err)
	}
	defer tx.Rollback(ctx)

	var it Item
	queryItem := `
		INSERT INTO item (budget_id, name, type)
		VALUES ($1, $2, $3)
		RETURNING id, budget_id, name, type, created_at
	`
	err = tx.QueryRow(ctx, queryItem, req.BudgetID, req.Name, req.Type).Scan(
		&it.ID,
		&it.BudgetID,
		&it.Name,
		&it.Type,
		&it.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("erro ao inserir item: %w", err)
	}

	it.Entries = make([]entry.Entry, 0, 12)

	// Inserir 12 entries mensais automaticamente
	insertEntryQuery := `
		INSERT INTO entry (item_id, month, planned_amount)
		VALUES ($1, $2, 0)
		RETURNING id, item_id, month, planned_amount, actual_amount,
		          to_char(due_date, 'YYYY-MM-DD'), to_char(paid_date, 'YYYY-MM-DD')
	`
	for m := 1; m <= 12; m++ {
		var e entry.Entry
		err = tx.QueryRow(ctx, insertEntryQuery, it.ID, m).Scan(
			&e.ID,
			&e.ItemID,
			&e.Month,
			&e.PlannedAmount,
			&e.ActualAmount,
			&e.DueDate,
			&e.PaidDate,
		)
		if err != nil {
			return nil, fmt.Errorf("erro ao gerar entry para mês %d: %w", m, err)
		}
		it.Entries = append(it.Entries, e)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("erro ao confirmar criação do item: %w", err)
	}

	return &it, nil
}

func (r *PostgresRepository) GetByID(ctx context.Context, id string) (*Item, error) {
	queryItem := `
		SELECT id, budget_id, name, type, created_at
		FROM item
		WHERE id = $1
	`
	var it Item
	err := r.pool.QueryRow(ctx, queryItem, id).Scan(
		&it.ID,
		&it.BudgetID,
		&it.Name,
		&it.Type,
		&it.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrItemNotFound
		}
		return nil, fmt.Errorf("erro ao buscar item: %w", err)
	}

	queryEntries := `
		SELECT id, item_id, month, planned_amount, actual_amount,
		       to_char(due_date, 'YYYY-MM-DD'), to_char(paid_date, 'YYYY-MM-DD')
		FROM entry
		WHERE item_id = $1
		ORDER BY month ASC
	`
	rows, err := r.pool.Query(ctx, queryEntries, id)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar lançamentos do item: %w", err)
	}
	defer rows.Close()

	it.Entries = make([]entry.Entry, 0, 12)
	for rows.Next() {
		var e entry.Entry
		if err := rows.Scan(
			&e.ID,
			&e.ItemID,
			&e.Month,
			&e.PlannedAmount,
			&e.ActualAmount,
			&e.DueDate,
			&e.PaidDate,
		); err != nil {
			return nil, fmt.Errorf("erro ao escanear entry: %w", err)
		}
		it.Entries = append(it.Entries, e)
	}

	return &it, nil
}

func (r *PostgresRepository) GetByBudgetID(ctx context.Context, budgetID string) ([]Item, error) {
	queryItems := `
		SELECT id, budget_id, name, type, created_at
		FROM item
		WHERE budget_id = $1
		ORDER BY created_at ASC, name ASC
	`
	rows, err := r.pool.Query(ctx, queryItems, budgetID)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar itens do orçamento: %w", err)
	}
	defer rows.Close()

	items := make([]Item, 0)
	itemMap := make(map[string]*Item)

	for rows.Next() {
		var it Item
		if err := rows.Scan(
			&it.ID,
			&it.BudgetID,
			&it.Name,
			&it.Type,
			&it.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("erro ao escanear item: %w", err)
		}
		it.Entries = make([]entry.Entry, 0, 12)
		items = append(items, it)
	}

	if len(items) == 0 {
		return items, nil
	}

	for i := range items {
		itemMap[items[i].ID] = &items[i]
	}

	queryEntries := `
		SELECT e.id, e.item_id, e.month, e.planned_amount, e.actual_amount,
		       to_char(e.due_date, 'YYYY-MM-DD'), to_char(e.paid_date, 'YYYY-MM-DD')
		FROM entry e
		JOIN item i ON e.item_id = i.id
		WHERE i.budget_id = $1
		ORDER BY e.item_id, e.month ASC
	`
	entryRows, err := r.pool.Query(ctx, queryEntries, budgetID)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar entries do orçamento: %w", err)
	}
	defer entryRows.Close()

	for entryRows.Next() {
		var e entry.Entry
		if err := entryRows.Scan(
			&e.ID,
			&e.ItemID,
			&e.Month,
			&e.PlannedAmount,
			&e.ActualAmount,
			&e.DueDate,
			&e.PaidDate,
		); err != nil {
			return nil, fmt.Errorf("erro ao escanear entry: %w", err)
		}
		if parent, ok := itemMap[e.ItemID]; ok {
			parent.Entries = append(parent.Entries, e)
		}
	}

	return items, nil
}

func (r *PostgresRepository) Patch(ctx context.Context, id string, req PatchItemRequest) (*Item, error) {
	setClauses := make([]string, 0)
	args := make([]interface{}, 0)
	argID := 1

	if req.Name != nil {
		setClauses = append(setClauses, "name = $"+strconv.Itoa(argID))
		args = append(args, *req.Name)
		argID++
	}
	if req.Type != nil {
		setClauses = append(setClauses, "type = $"+strconv.Itoa(argID))
		args = append(args, *req.Type)
		argID++
	}

	if len(setClauses) > 0 {
		args = append(args, id)
		query := fmt.Sprintf("UPDATE item SET %s WHERE id = $%d", strings.Join(setClauses, ", "), argID)
		cmdTag, err := r.pool.Exec(ctx, query, args...)
		if err != nil {
			return nil, fmt.Errorf("erro ao atualizar item: %w", err)
		}
		if cmdTag.RowsAffected() == 0 {
			return nil, ErrItemNotFound
		}
	}

	return r.GetByID(ctx, id)
}

func (r *PostgresRepository) Delete(ctx context.Context, id string) error {
	cmdTag, err := r.pool.Exec(ctx, "DELETE FROM item WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("erro ao excluir item: %w", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return ErrItemNotFound
	}
	return nil
}
