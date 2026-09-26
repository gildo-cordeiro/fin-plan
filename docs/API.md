# 🔌 FinPlan — Especificação da API REST (v1)

Esta documentação descreve todos os endpoints, contratos de requisição/resposta, cabeçalhos e regras de erro da camada de persistência REST do **FinPlan**.

A implementação do backend localiza-se em [`apps/api/`](../apps/api/) e é servida como uma API REST compilada em Go com o driver oficial do MongoDB.

---

## 🔒 Autenticação e Cabeçalhos

### Autenticação por API Key (Opcional / Configurável)
Se a variável de ambiente `API_SECRET_KEY` estiver definida no servidor Go, toda requisição às rotas protegidas deve incluir a chave secreta. O backend aceita a credencial em dois formatos:
1. Cabeçalho proprietário: `x-api-key: <API_SECRET_KEY>`
2. Cabeçalho padrão HTTP: `Authorization: Bearer <API_SECRET_KEY>`

Se a chave for omitida ou divergir do valor de `API_SECRET_KEY`, a API responderá com status `401 Unauthorized`. Caso a variável `API_SECRET_KEY` **não** esteja configurada no servidor, a verificação é ignorada (modo desenvolvimento aberto).

### Cabeçalhos Padrão de Resposta (CORS)
Todas as respostas incluem os seguintes cabeçalhos CORS:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Credentials: true`
- `Access-Control-Allow-Methods: GET,OPTIONS,POST,PATCH,DELETE`
- `Access-Control-Allow-Headers: X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-api-key, Authorization`

---

## 📦 Recursos e Endpoints da Nova API (Domínio Normalizado)

### 1. `GET /api/v1/health`
Health check para orquestradores (Docker, Kubernetes, Cloud Run).
- **Método**: `GET`
- **Resposta**: `200 OK` `{ "status": "ok" }`

---

### 2. Anos Orçamentários (`budget_years`) & Meses (`months`)

#### `GET /api/v1/budget-years`
Retorna todos os anos orçamentários cadastrados no sistema.
- **Resposta**: `200 OK`
  ```json
  [
    {
      "id": "2026",
      "year": 2026,
      "simulation": {
        "varsPercent": 0,
        "rendaPercent": 0,
        "oneTimeMarginPercent": 0,
        "initialBalance": 10000,
        "emergencyReserve": 5000
      },
      "createdAt": "2026-09-26T12:00:00Z",
      "updatedAt": "2026-09-26T12:00:00Z"
    }
  ]
  ```

#### `GET /api/v1/budget-years/{year}`
Retorna a **visão anual agregada** pronta para renderizar o frontend em 1 única requisição (join server-side em Go).
- **Resposta**: `200 OK`
  ```json
  {
    "year": {
      "id": "2026",
      "year": 2026,
      "simulation": { ... }
    },
    "months": [
      {
        "id": "2026-10",
        "budgetYearId": "2026",
        "name": "Outubro 2026",
        "shortName": "Out/26",
        "year": 2026,
        "monthIndex": 9
      }
    ],
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "type": "renda",
        "name": "Salário Líquido",
        "values": { "2026-10": 8500 }
      }
    ],
    "oneTimeCosts": [ ... ],
    "goals": [ ... ]
  }
  ```

#### `POST /api/v1/budget-years`
Cria um novo ano fiscal. Automaticamente inicializa os 12 meses correspondentes.
- **Payload**:
  ```json
  {
    "year": 2027,
    "simulation": {
      "initialBalance": 15000,
      "emergencyReserve": 10000
    }
  }
  ```

#### `PATCH /api/v1/budget-years/{year}`
Atualiza atomicamente as premissas de simulação daquele ano orçamentário.
- **Payload**:
  ```json
  {
    "varsPercent": 10,
    "initialBalance": 12000
  }
  ```

#### `POST /api/v1/budget-years/{year}/months`
Adiciona um mês personalizado ao ano fiscal.

---

### 3. Itens de Orçamento (`budget_items`)

Substitui as listas fixas monolíticas. O campo `type` define se o item é `renda`, `cartao`, `fixa` ou `var`. Um item pode conter valores trans-anuais mapeados por `monthId`.

#### `POST /api/v1/budget-items`
Cria um item de orçamento de forma atômica.
- **Payload**:
  ```json
  {
    "name": "Aluguel",
    "type": "fixa",
    "values": {
      "2026-10": 2500,
      "2026-11": 2500
    },
    "off": false
  }
  ```
- **Resposta**: `201 Created` com o objeto `BudgetItem`.

#### `GET /api/v1/budget-items`
Lista todos os itens de orçamento. Suporta filtro por query parameter: `?type=renda`.

#### `GET /api/v1/budget-items/{id}`
Recupera um item específico pelo ID.

#### `PATCH /api/v1/budget-items/{id}`
Edição atômica pontual. Altera apenas os campos enviados (e atualiza chaves em `values` sem sobrescrever os outros meses).
- **Payload**:
  ```json
  {
    "values": {
      "2026-10": 2700
    }
  }
  ```

#### `DELETE /api/v1/budget-items/{id}`
Exclui atomicamente o item.
- **Resposta**: `200 OK` `{ "success": true, "message": "Item de orçamento excluído com sucesso." }`

---

### 4. Custos Pontuais (`one_time_costs`)

#### `POST /api/v1/one-time-costs`
Cria um custo pontual.
- **Payload**:
  ```json
  {
    "name": "Reforma do Quarto",
    "value": 3500,
    "targetMonthId": "2026-11"
  }
  ```

#### `PATCH /api/v1/one-time-costs/{id}`
Atualiza campos do custo pontual.

#### `DELETE /api/v1/one-time-costs/{id}`
Exclui atomicamente o custo pontual.

---

### 5. Metas Financeiras (`goals`) & Aportes

#### `POST /api/v1/goals`
Cria uma nova meta financeira.
- **Payload**:
  ```json
  {
    "name": "Viagem de Férias",
    "targetAmount": 12000,
    "icon": "✈️",
    "color": "#0e6b7a",
    "status": "ativa"
  }
  ```

#### `PATCH /api/v1/goals/{id}`
Atualiza metadados ou status da meta (`ativa`, `concluida`, `pausada`).

#### `DELETE /api/v1/goals/{id}`
Exclui a meta e todos os seus aportes.

#### `POST /api/v1/goals/{id}/contributions`
Registra um novo aporte atomicamente utilizando operador `$push` no MongoDB.
- **Payload**:
  ```json
  {
    "amount": 1000,
    "note": "Depósito mensal",
    "date": "2026-10-15"
  }
  ```

#### `DELETE /api/v1/goals/{id}/contributions/{contributionId}`
Remove um aporte atomicamente utilizando operador `$pull` no MongoDB.
