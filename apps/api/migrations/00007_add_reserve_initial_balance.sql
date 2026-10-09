-- +goose Up
ALTER TABLE budget ADD COLUMN IF NOT EXISTS emergency_reserve_initial_balance NUMERIC(12,2) NOT NULL DEFAULT 0;

-- +goose Down
ALTER TABLE budget DROP COLUMN IF NOT EXISTS emergency_reserve_initial_balance;
