# ADENDO — Sincronizar o backend PostgreSQL com o plano do frontend

O plano de migração do frontend (`finplan-frontend-migration-plan.md`) já
assume um contrato de API mais detalhado do que o especificado no prompt
original de migração do backend (Mongo → Postgres). Esta tarefa atualiza o
backend (`apps/api`) para fechar essas lacunas, ANTES de a revisão do
frontend ser implementada — sem isso, o frontend vai chamar endpoints que
não existem.

## 1. Nova tabela: `cost_item`

O schema original tinha `cost` como tabela flat (um custo pontual = uma
linha). Isso mudou: um custo pontual agora é um **projeto** (`cost`) com N
itens (`cost_item`), cada um podendo herdar o mês do projeto ou sobrescrever
individualmente.

```sql
ALTER TABLE cost
  ADD COLUMN IF NOT EXISTS margin_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  ALTER COLUMN month DROP NOT NULL;  -- se 'month' já existir na tabela cost, vira default_month nullable

-- Renomear month -> default_month se ainda não estiver assim
ALTER TABLE cost RENAME COLUMN month TO default_month;

-- Remover colunas que migraram para cost_item (planned_amount, actual_amount, due_date, paid_date),
-- se a tabela cost original já as tinha
ALTER TABLE cost
  DROP COLUMN IF EXISTS planned_amount,
  DROP COLUMN IF EXISTS actual_amount,
  DROP COLUMN IF EXISTS due_date,
  DROP COLUMN IF EXISTS paid_date;

CREATE TABLE cost_item (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_id          UUID NOT NULL REFERENCES cost(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  planned_amount   NUMERIC(12,2) NOT NULL,
  actual_amount    NUMERIC(12,2),
  month            INT CHECK (month BETWEEN 1 AND 12),  -- NULL = herda cost.default_month
  due_date         DATE,
  paid_date        DATE
);
```

Gerar isso como migration versionada nova (`golang-migrate`/`goose`), não
editar migration já aplicada.

## 2. Endpoint `GET /api/v1/costs/{id}` com totais calculados no backend

```
GET /api/v1/costs/{id}
→ {
    id, budgetId, name, defaultMonth, marginPercent, notes,
    items: CostItem[],
    totalPlanned: number,      -- SUM(cost_item.planned_amount) WHERE cost_id = {id}
    totalWithMargin: number    -- totalPlanned * (1 + marginPercent/100)
  }
```

`totalPlanned` e `totalWithMargin` são calculados via SQL no repository
(agregação `SUM`), nunca no handler/service com lógica solta em Go — mantém
a fonte de verdade num único lugar, coerente com o padrão já usado no
`GetMonthlySummary`.

## 3. Novos endpoints de `cost_item`

```
POST   /api/v1/costs/{costId}/items          # cria item dentro do projeto
PATCH  /api/v1/costs/{costId}/items/{id}      # edita nome/valor/mês/confirmação
DELETE /api/v1/costs/{costId}/items/{id}
```

`PATCH` recalcula `totalPlanned`/`totalWithMargin` do `cost` pai
implicitamente (são derivados via `SUM`, não armazenados — nada a
recalcular manualmente, só a próxima leitura já reflete).

## 4. `reserve_movement`: reforçar imutabilidade

Confirmar/ajustar no backend:
```
POST /api/v1/reserve-movements                    # cria (aporte ou retirada)
GET  /api/v1/budgets/{year}/reserve-movements      # lista histórico
```
**Não implementar `PATCH`/`DELETE` para `reserve_movement`** — é
intencional, não uma lacuna. É um livro-razão imutável: corrigir um
lançamento errado é um novo movimento de sinal oposto, não uma edição do
original. Se o prompt de backend original já tinha `PATCH`/`DELETE` para
essa entidade, removê-los.

## 5. PATCH parcial de verdade (requisito crítico, não estava explícito antes)

O frontend usa `PATCH /api/v1/entries/{id}` tanto para editar
`plannedAmount` quanto para confirmar `actualAmount`/`paidDate`, com bodies
diferentes — e o mesmo padrão se aplica a `PATCH /costs/{costId}/items/{id}`.

**Implementação obrigatória**: o struct de request de cada `PATCH` deve usar
ponteiros (`*string`, `*float64`, etc.) para todo campo opcional, e o
repository só deve incluir no `UPDATE` os campos cujo ponteiro não é `nil`.
Nunca fazer `UPDATE entry SET planned_amount=$1, actual_amount=$2, ...`
genérico com todos os campos — isso sobrescreveria com `NULL`/zero qualquer
campo que não veio no request.

Exemplo de assinatura esperada:
```go
type PatchEntryRequest struct {
    PlannedAmount *float64 `json:"plannedAmount,omitempty"`
    ActualAmount  *float64 `json:"actualAmount,omitempty"`
    PaidDate      *string  `json:"paidDate,omitempty"`
}
```
Construir a query de update dinamicamente (ou usar `COALESCE` com o valor
atual) a partir de quais ponteiros estão preenchidos.

Aplicar esse mesmo padrão em TODOS os `PATCH` do backend (`entry`, `item`,
`cost`, `cost_item`, `budget`, `goal`) — não só em `entry`.

## 6. Contrato exato de `GET /api/v1/budgets/{year}/summary`

Fixar o formato de resposta exatamente como o frontend espera:

```go
type BudgetSummaryMonth struct {
    Month              int     `json:"month"`
    Income             float64 `json:"income"`
    Cards              float64 `json:"cards"`
    Fixed              float64 `json:"fixed"`
    Variable           float64 `json:"variable"`
    OneTimeCosts       float64 `json:"oneTimeCosts"`
    TotalExpenses      float64 `json:"totalExpenses"`
    MonthBalance       float64 `json:"monthBalance"`
    AccumulatedBalance float64 `json:"accumulatedBalance"`
}

type BudgetSummary struct {
    Year                    int                   `json:"year"`
    InitialBalance          float64               `json:"initialBalance"`
    EmergencyReserveTarget  float64               `json:"emergencyReserveTarget"`
    Months                  []BudgetSummaryMonth  `json:"months"`
    Totals                  struct {
        Income         float64 `json:"income"`
        Cards          float64 `json:"cards"`
        Fixed          float64 `json:"fixed"`
        Variable       float64 `json:"variable"`
        OneTimeCosts   float64 `json:"oneTimeCosts"`
        TotalExpenses  float64 `json:"totalExpenses"`
        NetBalance     float64 `json:"netBalance"`
        FinalAccumulated float64 `json:"finalAccumulated"`
    } `json:"totals"`
}
```

`accumulatedBalance` usa window function (`SUM(...) OVER (ORDER BY month)`)
somada a `initial_balance` — já especificado no prompt original de
migração, só formalizando o shape exato do JSON aqui para bater com o que o
frontend (`BudgetSummary` em TypeScript) espera campo a campo.

`oneTimeCosts` no summary mensal deve considerar `cost_item` com
`COALESCE(cost_item.month, cost.default_month)` — itens sem mês em nenhum
dos dois níveis (`default_month` também `NULL`) entram em
`totals.oneTimeCosts` (dedução no saldo final do ano), não em nenhum mês
específico.

## Validação obrigatória
- Rodar a nova migration (`cost_item`, ajustes em `cost`) contra o Postgres
  local e confirmar que sobe sem erro, junto das migrations já existentes.
- Testar `PATCH /entries/{id}` com body parcial (`{ "actualAmount": 100 }`)
  e confirmar que `plannedAmount` não é alterado.
- Testar `GET /costs/{id}` com múltiplos `cost_item` (um com `month` próprio,
  outro herdando `default_month`, outro com ambos nulos) e validar
  `totalPlanned`/`totalWithMargin`.
- Testar `GET /budgets/{year}/summary` e comparar o JSON retornado campo a
  campo contra o `BudgetSummary` esperado pelo frontend.
- Confirmar que `reserve_movement` não expõe `PATCH`/`DELETE` na API.
- Atualizar `docs/API.md` com todos os endpoints e contratos novos/alterados
  desta tarefa.
