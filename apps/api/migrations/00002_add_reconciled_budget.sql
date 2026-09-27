-- +goose Up
-- Adiciona suporte a conciliação de saldo em conta (âncora no mês atual)
ALTER TABLE budget ADD COLUMN IF NOT EXISTS reconciled_month INT CHECK (reconciled_month BETWEEN 1 AND 12);
ALTER TABLE budget ADD COLUMN IF NOT EXISTS reconciled_balance NUMERIC(12,2);

-- +goose Down
ALTER TABLE budget DROP COLUMN IF EXISTS reconciled_month;
ALTER TABLE budget DROP COLUMN IF EXISTS reconciled_balance;
