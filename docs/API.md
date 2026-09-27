# 🔌 FinPlan — Especificação da API REST (v1 — PostgreSQL)

Esta documentação descreve todos os endpoints, contratos de requisição/resposta, cabeçalhos e regras de negócio da API REST do **FinPlan**, baseada no modelo relacional PostgreSQL.

---

## 🔒 Autenticação e Cabeçalhos

### Autenticação por API Key (Opcional / Configurável)
Se a variável de ambiente `API_SECRET_KEY` estiver definida no servidor Go, toda requisição às rotas da API deve incluir a chave secreta. O backend aceita a credencial em dois formatos:
1. Cabeçalho proprietário: `x-api-key: <API_SECRET_KEY>`
2. Cabeçalho padrão HTTP: `Authorization: Bearer <API_SECRET_KEY>`

Se omitida ou incorreta, responde com `401 Unauthorized`. Caso `API_SECRET_KEY` não esteja configurada, a verificação é ignorada (modo desenvolvimento aberto).

### Cabeçalhos CORS
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Credentials: true`
- `Access-Control-Allow-Methods: GET,OPTIONS,POST,PATCH,DELETE`
- `Access-Control-Allow-Headers: X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-api-key, Authorization`

---

## 📐 Schema Relacional do Banco de Dados (PostgreSQL)

```sql
-- Ano de orçamento (id = ano, chave natural)
CREATE TABLE budget (
  id                        TEXT PRIMARY KEY,        -- ex: '2026'
  year                      INT NOT NULL UNIQUE,
  initial_balance           NUMERIC(12,2) NOT NULL DEFAULT 0,
  emergency_reserve_target  NUMERIC(12,2) NOT NULL DEFAULT 0,
  reconciled_month          INT CHECK (reconciled_month BETWEEN 1 AND 12),
  reconciled_balance        NUMERIC(12,2),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Item recorrente: "Salário", "Aluguel", "Cartão XP"
CREATE TABLE item (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id   TEXT NOT NULL REFERENCES budget(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('renda','fixa','variavel','cartao')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lançamento mensal do item — gerado automaticamente (12 linhas) na criação do item
CREATE TABLE entry (
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
CREATE TABLE cost (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id        TEXT NOT NULL REFERENCES budget(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  default_month    INT CHECK (default_month BETWEEN 1 AND 12),  -- NULL = deduz no saldo final
  margin_percent   NUMERIC(5,2) NOT NULL DEFAULT 0,              -- Margem de imprevistos (%)
  notes            TEXT
);

-- Item individual dentro do projeto de custo pontual
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

-- Meta financeira
CREATE TABLE goal (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  description    TEXT,
  target_amount  NUMERIC(12,2) NOT NULL,
  icon           TEXT,
  color          TEXT,
  status         TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','concluida','pausada'))
);

CREATE TABLE goal_contribution (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id  UUID NOT NULL REFERENCES goal(id) ON DELETE CASCADE,
  date     DATE NOT NULL,
  amount   NUMERIC(12,2) NOT NULL,
  note     TEXT
);

-- Movimentação da reserva de emergência (Livro-razão imutável)
CREATE TABLE reserve_movement (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id  TEXT NOT NULL REFERENCES budget(id) ON DELETE CASCADE,
  month      INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount     NUMERIC(12,2) NOT NULL,   -- positivo = aporte, negativo = retirada
  reason     TEXT
);
```

---

## 📦 Endpoints da API

### 1. Sistema
- `GET /api/v1/health`
  - Resposta: `200 OK` `{ "status": "ok" }`

---

### 2. Orçamento (`budget`)

#### `GET /api/v1/budgets`
Lista todos os anos orçamentários cadastrados.
- Resposta: `200 OK`
```json
[
  {
    "id": "2026",
    "year": 2026,
    "initialBalance": 10000.00,
    "emergencyReserveTarget": 5000.00,
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-01-01T00:00:00Z"
  }
]
```

#### `POST /api/v1/budgets`
Cria um novo ano orçamentário.
- Body:
```json
{
  "year": 2027,
  "initialBalance": 12000.00,
  "emergencyReserveTarget": 6000.00
}
```
- Resposta: `201 Created` com o objeto `Budget`.

#### `GET /api/v1/budgets/{year}`
Retorna a **visão anual completa** do ano: budget, itens com suas 12 entries, custos pontuais com cost_items, metas e movimentações de reserva.
- Resposta: `200 OK`
```json
{
  "budget": {
    "id": "2026",
    "year": 2026,
    "initialBalance": 10000.00,
    "emergencyReserveTarget": 5000.00
  },
  "items": [
    {
      "id": "a1b2c3d4-...",
      "budgetId": "2026",
      "name": "Salário Líquido",
      "type": "renda",
      "entries": [
        {
          "id": "e1-...",
          "itemId": "a1b2c3d4-...",
          "month": 1,
          "plannedAmount": 8500.00,
          "actualAmount": 8500.00,
          "dueDate": null,
          "paidDate": "2026-01-05"
        }
      ]
    }
  ],
  "costs": [
    {
      "id": "c1-...",
      "budgetId": "2026",
      "name": "Mudança",
      "defaultMonth": 12,
      "marginPercent": 10.0,
      "totalPlanned": 4000.00,
      "totalWithMargin": 4400.00,
      "items": [
        {
          "id": "ci-1-...",
          "costId": "c1-...",
          "name": "Frete e Caminhão",
          "plannedAmount": 1500.00,
          "actualAmount": null,
          "month": null,
          "paidDate": null
        }
      ]
    }
  ],
  "goals": [],
  "reserveMovements": []
}
```

#### `PATCH /api/v1/budgets/{year}`
Atualiza initialBalance, emergencyReserveTarget, reconciledMonth ou reconciledBalance. Suporta atualização parcial estrita.
- Body:
```json
{
  "initialBalance": 15000.00,
  "reconciledMonth": 9,
  "reconciledBalance": 18500.00
}
```

#### `GET /api/v1/budgets/{year}/summary`
Retorna o resumo consolidado mensal com cálculo acumulado server-side e window functions (respeitando a âncora de conciliação caso definida).
- Resposta: `200 OK`
```json
{
  "year": 2026,
  "initialBalance": 10000.00,
  "emergencyReserveTarget": 5000.00,
  "reconciledMonth": 9,
  "reconciledBalance": 18500.00,
  "months": [
    {
      "month": 1,
      "income": 8500.00,
      "cards": 2000.00,
      "fixed": 2500.00,
      "variable": 1000.00,
      "oneTimeCosts": 0.00,
      "totalExpenses": 5500.00,
      "monthBalance": 3000.00,
      "accumulatedBalance": 13000.00
    }
  ],
  "totals": {
    "income": 102000.00,
    "cards": 24000.00,
    "fixed": 30000.00,
    "variable": 12000.00,
    "oneTimeCosts": 4400.00,
    "totalExpenses": 70400.00,
    "netBalance": 31600.00,
    "finalAccumulated": 41600.00
  }
}
```

---

### 3. Itens e Lançamentos (`item` e `entry`)

#### `POST /api/v1/items`
Cria um item no orçamento. **O backend gera automaticamente 12 entries** (uma para cada mês, com `planned_amount = 0`).
- Body:
```json
{
  "budgetId": "2026",
  "name": "Supermercado",
  "type": "variavel"
}
```
- Resposta: `201 Created` com o objeto `Item` e o array `entries`.

#### `PATCH /api/v1/items/{id}`
Atualiza atributos do item (ex: renomear).
- Body: `{ "name": "Mercado e Feira" }`

#### `DELETE /api/v1/items/{id}`
Exclui o item e remove suas 12 entries associadas em cascata.

#### `PATCH /api/v1/entries/{id}`
Atualização parcial de lançamento. Permite editar o valor previsto ou confirmar/desconfirmar o pagamento realizado:
- Para alterar o planejado:
  ```json
  { "plannedAmount": 1200.00 }
  ```
- Para confirmar pagamento realizado:
  ```json
  { "actualAmount": 1150.00, "paidDate": "2026-10-05" }
  ```
- Para desconfirmar lançamento:
  ```json
  { "actualAmount": null, "paidDate": null }
  ```

---

### 4. Projetos de Custo Pontual (`cost` e `cost_item`)

#### `POST /api/v1/costs`
Cria um projeto de custo pontual.
- Body:
```json
{
  "budgetId": "2026",
  "name": "Reforma do Banheiro",
  "defaultMonth": 11,
  "marginPercent": 15.0,
  "notes": "Orçamento estimado com pedreiro e materiais"
}
```

#### `GET /api/v1/costs/{id}`
Retorna o projeto com todos os seus `items` e os totais calculados no backend:
- `totalPlanned`: `SUM(cost_item.planned_amount)`
- `totalWithMargin`: `totalPlanned * (1 + margin_percent / 100)`

#### `PATCH /api/v1/costs/{id}`
Atualização parcial do projeto (`name`, `defaultMonth`, `marginPercent`, `notes`).

#### `DELETE /api/v1/costs/{id}`
Exclui o projeto e todos os seus itens associados em cascata.

#### `POST /api/v1/costs/{costId}/items`
Adiciona um item dentro do projeto.
- Body:
```json
{
  "name": "Piso Porcelanato",
  "plannedAmount": 1200.00,
  "month": null
}
```
*(Se `month` for `null`, o item herda o `default_month` do projeto).*

#### `PATCH /api/v1/costs/{costId}/items/{id}`
Atualização parcial do item de custo (valor, nome, mês ou confirmação de pagamento).

#### `DELETE /api/v1/costs/{costId}/items/{id}`
Remove o item do projeto.

---

### 5. Metas Financeiras (`goal` e `goal_contribution`)

#### `POST /api/v1/goals`
Cria uma meta financeira.
- Body:
```json
{
  "name": "Reserva de Emergência 6 Meses",
  "targetAmount": 30000.00,
  "icon": "🛡️",
  "color": "#0e6b7a",
  "status": "ativa"
}
```

#### `PATCH /api/v1/goals/{id}`
Atualiza meta (`name`, `targetAmount`, `status`, etc.).

#### `DELETE /api/v1/goals/{id}`
Exclui meta e seus aportes em cascata.

#### `POST /api/v1/goals/{id}/contributions`
Registra um aporte na meta.
- Body:
```json
{
  "amount": 1000.00,
  "note": "Aporte mensal via sobra de salário",
  "date": "2026-10-05"
}
```

#### `DELETE /api/v1/goals/{id}/contributions/{contributionId}`
Remove um aporte.

---

### 6. Movimentações da Reserva (`reserve_movement`)

#### `POST /api/v1/reserve-movements`
Registra uma movimentação na reserva de emergência (aporte positivo ou retirada negativa).
- Body:
```json
{
  "budgetId": "2026",
  "month": 10,
  "amount": 1500.00,
  "reason": "Depósito de rendimentos extras"
}
```

#### `GET /api/v1/budgets/{year}/reserve-movements`
Retorna o histórico cronológico de movimentações da reserva para o ano.

> ⚠️ **Imutabilidade**: A entidade `reserve_movement` **não** disponibiliza `PATCH` ou `DELETE`. Para retificar um lançamento, registre um novo movimento com o valor oposto.
