-- +goose Up
-- Remove suporte a conciliação de saldo em conta (revert de conciliação)
ALTER TABLE budget DROP COLUMN IF EXISTS reconciled_month;
ALTER TABLE budget DROP COLUMN IF EXISTS reconciled_balance;

-- +goose Down
ALTER TABLE budget ADD COLUMN IF NOT EXISTS reconciled_month INT CHECK (reconciled_month BETWEEN 1 AND 12);
ALTER TABLE budget ADD COLUMN IF NOT EXISTS reconciled_balance NUMERIC(12,2);
