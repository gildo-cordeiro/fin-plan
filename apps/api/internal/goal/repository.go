package goal

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
	ErrGoalNotFound         = errors.New("meta financeira não encontrada")
	ErrContributionNotFound = errors.New("contribuição não encontrada")
)

type Repository interface {
	Create(ctx context.Context, req CreateGoalRequest) (*Goal, error)
	GetByID(ctx context.Context, id string) (*Goal, error)
	GetAll(ctx context.Context) ([]Goal, error)
	Patch(ctx context.Context, id string, req PatchGoalRequest) (*Goal, error)
	Delete(ctx context.Context, id string) error
	AddContribution(ctx context.Context, goalID string, req CreateContributionRequest) (*Goal, error)
	DeleteContribution(ctx context.Context, goalID string, contributionID string) (*Goal, error)
}

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) Create(ctx context.Context, req CreateGoalRequest) (*Goal, error) {
	status := "ativa"
	if req.Status != nil && *req.Status != "" {
		status = *req.Status
	}

	query := `
		INSERT INTO goal (name, description, target_amount, color, status)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, name, description, target_amount, color, status
	`

	var g Goal
	err := r.pool.QueryRow(ctx, query,
		req.Name,
		req.Description,
		req.TargetAmount,
		req.Color,
		status,
	).Scan(
		&g.ID,
		&g.Name,
		&g.Description,
		&g.TargetAmount,
		&g.Color,
		&g.Status,
	)
	if err != nil {
		return nil, fmt.Errorf("erro ao criar meta: %w", err)
	}

	g.Contributions = make([]GoalContribution, 0)
	return &g, nil
}

func (r *PostgresRepository) GetByID(ctx context.Context, id string) (*Goal, error) {
	queryGoal := `
		SELECT id, name, description, target_amount, color, status
		FROM goal
		WHERE id = $1
	`

	var g Goal
	err := r.pool.QueryRow(ctx, queryGoal, id).Scan(
		&g.ID,
		&g.Name,
		&g.Description,
		&g.TargetAmount,
		&g.Color,
		&g.Status,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrGoalNotFound
		}
		return nil, fmt.Errorf("erro ao buscar meta: %w", err)
	}

	queryContrib := `
		SELECT id, goal_id, to_char(date, 'YYYY-MM-DD'), amount, note
		FROM goal_contribution
		WHERE goal_id = $1
		ORDER BY date ASC, id ASC
	`
	rows, err := r.pool.Query(ctx, queryContrib, id)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar contribuições da meta: %w", err)
	}
	defer rows.Close()

	g.Contributions = make([]GoalContribution, 0)
	for rows.Next() {
		var c GoalContribution
		if err := rows.Scan(
			&c.ID,
			&c.GoalID,
			&c.Date,
			&c.Amount,
			&c.Note,
		); err != nil {
			return nil, fmt.Errorf("erro ao escanear contribuição: %w", err)
		}
		g.Contributions = append(g.Contributions, c)
	}

	return &g, nil
}

func (r *PostgresRepository) GetAll(ctx context.Context) ([]Goal, error) {
	queryGoals := `
		SELECT id, name, description, target_amount, color, status
		FROM goal
		ORDER BY name ASC
	`

	rows, err := r.pool.Query(ctx, queryGoals)
	if err != nil {
		return nil, fmt.Errorf("erro ao listar metas: %w", err)
	}
	defer rows.Close()

	goals := make([]Goal, 0)
	goalMap := make(map[string]*Goal)

	for rows.Next() {
		var g Goal
		if err := rows.Scan(
			&g.ID,
			&g.Name,
			&g.Description,
			&g.TargetAmount,
			&g.Color,
			&g.Status,
		); err != nil {
			return nil, fmt.Errorf("erro ao escanear meta: %w", err)
		}
		g.Contributions = make([]GoalContribution, 0)
		goals = append(goals, g)
	}

	if len(goals) == 0 {
		return goals, nil
	}

	for i := range goals {
		goalMap[goals[i].ID] = &goals[i]
	}

	queryContribs := `
		SELECT id, goal_id, to_char(date, 'YYYY-MM-DD'), amount, note
		FROM goal_contribution
		ORDER BY date ASC, id ASC
	`
	cRows, err := r.pool.Query(ctx, queryContribs)
	if err != nil {
		return nil, fmt.Errorf("erro ao listar contribuições: %w", err)
	}
	defer cRows.Close()

	for cRows.Next() {
		var c GoalContribution
		if err := cRows.Scan(
			&c.ID,
			&c.GoalID,
			&c.Date,
			&c.Amount,
			&c.Note,
		); err != nil {
			return nil, fmt.Errorf("erro ao escanear contribuição: %w", err)
		}
		if parent, ok := goalMap[c.GoalID]; ok {
			parent.Contributions = append(parent.Contributions, c)
		}
	}

	return goals, nil
}

func (r *PostgresRepository) Patch(ctx context.Context, id string, req PatchGoalRequest) (*Goal, error) {
	setClauses := make([]string, 0)
	args := make([]interface{}, 0)
	argID := 1

	if req.Name != nil {
		setClauses = append(setClauses, "name = $"+strconv.Itoa(argID))
		args = append(args, *req.Name)
		argID++
	}
	if req.Description != nil {
		setClauses = append(setClauses, "description = $"+strconv.Itoa(argID))
		args = append(args, *req.Description)
		argID++
	}
	if req.TargetAmount != nil {
		setClauses = append(setClauses, "target_amount = $"+strconv.Itoa(argID))
		args = append(args, *req.TargetAmount)
		argID++
	}

	if req.Color != nil {
		setClauses = append(setClauses, "color = $"+strconv.Itoa(argID))
		args = append(args, *req.Color)
		argID++
	}
	if req.Status != nil {
		setClauses = append(setClauses, "status = $"+strconv.Itoa(argID))
		args = append(args, *req.Status)
		argID++
	}

	if len(setClauses) > 0 {
		args = append(args, id)
		query := fmt.Sprintf("UPDATE goal SET %s WHERE id = $%d", strings.Join(setClauses, ", "), argID)
		cmdTag, err := r.pool.Exec(ctx, query, args...)
		if err != nil {
			return nil, fmt.Errorf("erro ao atualizar meta: %w", err)
		}
		if cmdTag.RowsAffected() == 0 {
			return nil, ErrGoalNotFound
		}
	}

	return r.GetByID(ctx, id)
}

func (r *PostgresRepository) Delete(ctx context.Context, id string) error {
	cmdTag, err := r.pool.Exec(ctx, "DELETE FROM goal WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("erro ao excluir meta: %w", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return ErrGoalNotFound
	}
	return nil
}

func (r *PostgresRepository) AddContribution(ctx context.Context, goalID string, req CreateContributionRequest) (*Goal, error) {
	// Verificar se meta existe
	var exists bool
	err := r.pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM goal WHERE id = $1)", goalID).Scan(&exists)
	if err != nil || !exists {
		return nil, ErrGoalNotFound
	}

	query := `
		INSERT INTO goal_contribution (goal_id, date, amount, note)
		VALUES ($1, $2::date, $3, $4)
	`
	_, err = r.pool.Exec(ctx, query, goalID, req.Date, req.Amount, req.Note)
	if err != nil {
		return nil, fmt.Errorf("erro ao adicionar contribuição: %w", err)
	}

	return r.GetByID(ctx, goalID)
}

func (r *PostgresRepository) DeleteContribution(ctx context.Context, goalID string, contributionID string) (*Goal, error) {
	cmdTag, err := r.pool.Exec(ctx, "DELETE FROM goal_contribution WHERE id = $1 AND goal_id = $2", contributionID, goalID)
	if err != nil {
		return nil, fmt.Errorf("erro ao excluir contribuição: %w", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return nil, ErrContributionNotFound
	}

	return r.GetByID(ctx, goalID)
}
