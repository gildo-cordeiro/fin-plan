-- +goose Up
-- Habilitar extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ano de orçamento (id = ano, chave natural)
CREATE TABLE IF NOT EXISTS budget (
  id                        TEXT PRIMARY KEY,        -- ex: '2026'
  year                      INT NOT NULL UNIQUE,
  initial_balance           NUMERIC(12,2) NOT NULL DEFAULT 0,
  emergency_reserve_target  NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Item recorrente: "Salário", "Aluguel", "Cartão XP"
CREATE TABLE IF NOT EXISTS item (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id   TEXT NOT NULL REFERENCES budget(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('renda','fixa','variavel','cartao')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lançamento mensal do item — gerado automaticamente (12 linhas) na criação do item
CREATE TABLE IF NOT EXISTS entry (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         UUID NOT NULL REFERENCES item(id) ON DELETE CASCADE,
  month           INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  planned_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  actual_amount   NUMERIC(12,2),                     -- null = ainda não confirmado
  due_date        DATE,
  paid_date       DATE,                              -- preenchido = "confirmado" (sem coluna de status)
  UNIQUE (item_id, month)
);

-- Projeto/evento de custo pontual (ex: "Mudança")
CREATE TABLE IF NOT EXISTS cost (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id        TEXT NOT NULL REFERENCES budget(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  default_month    INT CHECK (default_month BETWEEN 1 AND 12),  -- NULL = deduz no saldo final
  margin_percent   NUMERIC(5,2) NOT NULL DEFAULT 0,              -- Margem de imprevistos (%)
  notes            TEXT
);

-- Item individual dentro do projeto de custo pontual
CREATE TABLE IF NOT EXISTS cost_item (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_id          UUID NOT NULL REFERENCES cost(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  planned_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  actual_amount    NUMERIC(12,2),
  month            INT CHECK (month BETWEEN 1 AND 12),  -- NULL = herda cost.default_month; ambos NULL = deduz no saldo final
  due_date         DATE,
  paid_date        DATE
);

-- Meta financeira
CREATE TABLE IF NOT EXISTS goal (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  description    TEXT,
  target_amount  NUMERIC(12,2) NOT NULL,
  icon           TEXT,
  color          TEXT,
  status         TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','concluida','pausada'))
);

CREATE TABLE IF NOT EXISTS goal_contribution (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id  UUID NOT NULL REFERENCES goal(id) ON DELETE CASCADE,
  date     DATE NOT NULL,
  amount   NUMERIC(12,2) NOT NULL,
  note     TEXT
);

-- Movimentação da reserva de emergência (Livro-razão imutável)
CREATE TABLE IF NOT EXISTS reserve_movement (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id  TEXT NOT NULL REFERENCES budget(id) ON DELETE CASCADE,
  month      INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount     NUMERIC(12,2) NOT NULL,   -- positivo = aporte, negativo = retirada
  reason     TEXT
);

-- Índices para otimização de consultas e joins
CREATE INDEX IF NOT EXISTS idx_item_budget_id ON item(budget_id);
CREATE INDEX IF NOT EXISTS idx_entry_item_id ON entry(item_id);
CREATE INDEX IF NOT EXISTS idx_cost_budget_id ON cost(budget_id);
CREATE INDEX IF NOT EXISTS idx_cost_item_cost_id ON cost_item(cost_id);
CREATE INDEX IF NOT EXISTS idx_goal_contrib_goal_id ON goal_contribution(goal_id);
CREATE INDEX IF NOT EXISTS idx_reserve_budget_id ON reserve_movement(budget_id);

-- +goose Down
DROP TABLE IF EXISTS reserve_movement CASCADE;
DROP TABLE IF EXISTS goal_contribution CASCADE;
DROP TABLE IF EXISTS goal CASCADE;
DROP TABLE IF EXISTS cost_item CASCADE;
DROP TABLE IF EXISTS cost CASCADE;
DROP TABLE IF EXISTS entry CASCADE;
DROP TABLE IF EXISTS item CASCADE;
DROP TABLE IF EXISTS budget CASCADE;
