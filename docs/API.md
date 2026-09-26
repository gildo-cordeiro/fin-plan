# 🔌 FinPlan — Especificação da API REST

Esta documentação descreve todos os endpoints, contratos de requisição/resposta e regras de erro da camada de persistência serverless do **FinPlan**.

A implementação do endpoint localiza-se em [`api/budget.ts`](file:///home/gildo-duarte/Documentos/Projects/fin-plan/api/budget.ts) e é servida como uma Vercel Serverless Function em produção e emulada por middleware SSR do Vite em ambiente de desenvolvimento local.

---

## 🔒 Autenticação e Cabeçalhos

### Autenticação por API Key (Opcional / Configurável)
Se a variável de ambiente `API_SECRET_KEY` estiver definida no servidor, toda requisição aos métodos `GET` e `POST` deve incluir a chave secreta. O backend aceita a credencial em dois formatos:
1. Cabeçalho proprietário: `x-api-key: <API_SECRET_KEY>`
2. Cabeçalho padrão HTTP: `Authorization: Bearer <API_SECRET_KEY>`

Se a chave for omitida ou divergir do valor de `API_SECRET_KEY`, a API responderá com status `401 Unauthorized`. Caso a variável `API_SECRET_KEY` **não** esteja configurada no servidor, a verificação é ignorada.

### Cabeçalhos Padrão de Resposta (CORS)
Todas as respostas incluem os seguintes cabeçalhos CORS:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Credentials: true`
- `Access-Control-Allow-Methods: GET,OPTIONS,POST`
- `Access-Control-Allow-Headers: X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-api-key, Authorization`

---

## 📦 Recursos e Endpoints

### Domínio: Orçamento & Persistência

#### 1. `OPTIONS /api/budget`
Executa a validação de pré-vôo (preflight) para clientes CORS.

- **Método**: `OPTIONS`
- **Autenticação**: Não requerida
- **Resposta**:
  - `200 OK` (sem corpo, apenas cabeçalhos)

---

#### 2. `GET /api/budget`
Recupera o estado mais recente do orçamento armazenado no MongoDB Atlas (`_id: 'default_budget'`).

- **Método**: `GET`
- **Autenticação**: Obrigatória via `x-api-key` ou `Authorization` caso `API_SECRET_KEY` esteja definida.
- **Cabeçalhos de Requisição**:
  ```http
  Accept: application/json
  x-api-key: <chave_secreta_opcional>
  ```
- **Respostas de Sucesso**:
  - **`200 OK` — Orçamento encontrado**:
    ```json
    {
      "exists": true,
      "data": {
        "version": 5,
        "months": [
          {
            "id": "2026-10",
            "name": "Outubro 2026",
            "shortName": "Out/26",
            "year": 2026,
            "monthIndex": 9
          }
        ],
        "simulation": {
          "varsPercent": 0,
          "rendaPercent": 0,
          "oneTimeMarginPercent": 0,
          "initialBalance": 10000,
          "emergencyReserve": 5000
        },
        "incomes": [
          {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "name": "Salário Principal",
            "category": "renda",
            "values": {
              "2026-10": 8000
            },
            "off": false
          }
        ],
        "lists": {
          "cartoes": [],
          "fixas": [],
          "vars": []
        },
        "oneTimeCosts": [],
        "goals": []
      },
      "updatedAt": "2026-09-26T12:00:00.000Z"
    }
    ```
  - **`200 OK` — Documento ainda não inicializado no banco**:
    ```json
    {
      "exists": false,
      "data": null
    }
    ```

- **Respostas de Erro**:
  - **`401 Unauthorized`**:
    ```json
    {
      "error": "Acesso não autorizado. Chave de API ausente ou inválida."
    }
    ```
  - **`503 Service Unavailable`** (Variável `MONGODB_URI` ausente no ambiente):
    ```json
    {
      "error": "MONGODB_URI não configurada nas variáveis de ambiente da Vercel. Adicione MONGODB_URI nas variáveis do projeto na Vercel (Project Settings -> Environment Variables)."
    }
    ```
  - **`500 Internal Server Error`** (Timeout ou falha de rede com o cluster MongoDB):
    ```json
    {
      "error": "Server selection timed out after 8000 ms"
    }
    ```

---

#### 3. `POST /api/budget`
Persiste atomicamente o estado completo do orçamento no documento único `default_budget` via `updateOne` com `{ upsert: true }`.

- **Método**: `POST`
- **Autenticação**: Obrigatória via `x-api-key` ou `Authorization` caso `API_SECRET_KEY` esteja definida.
- **Cabeçalhos de Requisição**:
  ```http
  Content-Type: application/json
  Accept: application/json
  x-api-key: <chave_secreta_opcional>
  ```
- **Corpo da Requisição (Payload)**: Objeto JSON representando o `BudgetState` completo:
  ```json
  {
    "version": 5,
    "months": [
      {
        "id": "2026-10",
        "name": "Outubro 2026",
        "shortName": "Out/26",
        "year": 2026,
        "monthIndex": 9
      },
      {
        "id": "2026-11",
        "name": "Novembro 2026",
        "shortName": "Nov/26",
        "year": 2026,
        "monthIndex": 10
      }
    ],
    "simulation": {
      "varsPercent": 0,
      "rendaPercent": 0,
      "oneTimeMarginPercent": 0,
      "initialBalance": 10000,
      "emergencyReserve": 5000
    },
    "incomes": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Salário Líquido",
        "category": "renda",
        "values": {
          "2026-10": 8500,
          "2026-11": 8500
        },
        "off": false
      }
    ],
    "lists": {
      "cartoes": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440001",
          "name": "Cartão Crédito XP",
          "category": "cartoes",
          "values": {
            "2026-10": 2100,
            "2026-11": 1800
          },
          "off": false
        }
      ],
      "fixas": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440002",
          "name": "Aluguel",
          "category": "fixas",
          "values": {
            "2026-10": 2500,
            "2026-11": 2500
          },
          "off": false
        }
      ],
      "vars": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440003",
          "name": "Supermercado",
          "category": "vars",
          "values": {
            "2026-10": 1300,
            "2026-11": 1300
          },
          "off": false
        }
      ]
    },
    "oneTimeCosts": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440004",
        "name": "Caução / Mudança",
        "value": 4500,
        "targetMonthId": "2026-11",
        "off": false
      }
    ],
    "goals": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440005",
        "name": "Reserva de Emergência",
        "targetAmount": 30000,
        "status": "ativa",
        "contributions": [
          {
            "id": "550e8400-e29b-41d4-a716-446655440006",
            "date": "2026-09-26",
            "amount": 2000,
            "note": "Aporte inicial"
          }
        ]
      }
    ]
  }
  ```

- **Respostas de Sucesso**:
  - **`200 OK`**:
    ```json
    {
      "success": true,
      "message": "Orçamento persistido no MongoDB Atlas com sucesso.",
      "updatedAt": "2026-09-26T12:05:30.123Z"
    }
    ```

- **Respostas de Erro**:
  - **`400 Bad Request`** (Corpo ausente, string inválida ou tipo não-objeto):
    ```json
    {
      "error": "Corpo da requisição inválido ou ausente."
    }
    ```
  - **`401 Unauthorized`**:
    ```json
    {
      "error": "Acesso não autorizado. Chave de API ausente ou inválida."
    }
    ```
  - **`503 Service Unavailable`** (`MONGODB_URI` não configurada):
    ```json
    {
      "error": "MONGODB_URI não configurada nas variáveis de ambiente da Vercel. Adicione MONGODB_URI nas variáveis do projeto na Vercel (Project Settings -> Environment Variables)."
    }
    ```
  - **`500 Internal Server Error`**:
    ```json
    {
      "error": "Erro interno do servidor"
    }
    ```

---

#### 4. Métodos Não Suportados (`PUT`, `DELETE`, `PATCH`, etc.)
- **Status de Resposta**: `405 Method Not Allowed`
- **Corpo**:
  ```json
  {
    "error": "Método PUT não suportado."
  }
  ```
