# 🚀 FinPlan Backend Go

Backend API em Go para o FinPlan, substituindo a função serverless Vercel (`api/budget.ts`) por uma aplicação containerizada — pronta para rodar em qualquer plataforma que aceite containers Docker.

## Arquitetura

```
api/
├── cmd/
│   └── api/
│       └── main.go              # Entrypoint enxuto (signal.NotifyContext + app.Run)
├── internal/
│   ├── app/
│   │   ├── app.go               # Application bootstrap (centraliza banco, DI, auto-indexing, rotas, shutdown)
│   │   └── app_test.go          # Testes unitários do ciclo de vida da aplicação
│   ├── budgetitem/              # Itens orçamentários trans-anuais (CRUD atômico)
│   ├── budgetyear/              # Anos orçamentários, meses e agregação YearViewModel
│   ├── goal/                    # Metas financeiras e aportes atômicos ($push/$pull)
│   ├── onetimecost/             # Custos pontuais com targetMonthId
│   ├── httputil/                # Respostas padronizadas (WriteJSON/WriteError) e UUIDv4
│   ├── middleware/
│   │   ├── auth.go              # API key (x-api-key / Authorization: Bearer)
│   │   └── cors.go              # Headers CORS idênticos ao contrato atual
│   └── config/
│       └── config.go            # Leitura de env vars (12-factor)
├── Dockerfile                   # Multi-stage build (golang:1.23-alpine → distroless)
├── go.mod / go.sum
└── README.md                    # Este arquivo
```

## Endpoints

### Anos Orçamentários (`BudgetYear`)
| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/v1/budget-years` | Lista todos os anos orçamentários cadastrados |
| `POST` | `/api/v1/budget-years` | Cria um novo ano orçamentário (auto-semeia 12 meses) |
| `GET` | `/api/v1/budget-years/{year}` | Retorna visão agregada do ano (`YearViewModel`) |
| `PATCH` | `/api/v1/budget-years/{year}` | Atualiza parâmetros de simulação daquele ano |
| `POST` | `/api/v1/budget-years/{year}/months` | Adiciona um mês específico ao ano orçamentário |

### Itens de Orçamento (`BudgetItem` — Trans-anuais)
| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/v1/budget-items` | Lista todos os itens orçamentários (filtro opcional `?type=`) |
| `POST` | `/api/v1/budget-items` | Cria um novo item orçamentário com ID UUIDv4 |
| `PATCH` | `/api/v1/budget-items/{id}` | Atualização atômica de campos ou valores mensais |
| `DELETE` | `/api/v1/budget-items/{id}` | Exclui um item orçamentário |

### Custos Pontuais (`OneTimeCost`)
| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/v1/one-time-costs` | Lista todos os custos pontuais |
| `POST` | `/api/v1/one-time-costs` | Cria um custo pontual |
| `PATCH` | `/api/v1/one-time-costs/{id}` | Atualiza nome, valor, mês alvo ou ativação |
| `DELETE` | `/api/v1/one-time-costs/{id}` | Remove um custo pontual |

### Metas Financeiras (`Goal`)
| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/v1/goals` | Lista todas as metas financeiras |
| `POST` | `/api/v1/goals` | Cria uma nova meta |
| `PATCH` | `/api/v1/goals/{id}` | Atualiza dados da meta (nome, valor alvo, status) |
| `DELETE` | `/api/v1/goals/{id}` | Remove uma meta |
| `POST` | `/api/v1/goals/{id}/contributions` | Registra aporte atômico na meta (MongoDB `$push`) |
| `DELETE` | `/api/v1/goals/{id}/contributions/{contribId}` | Estorna aporte atômico da meta (MongoDB `$pull`) |

### Sistema
| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/v1/health` | Health check (`{ "status": "ok" }`) |

O contrato de request/response (campos, status codes, mensagens de erro) é **idêntico** ao documentado em [`docs/API.md`](../docs/API.md), com o prefixo `/api/v1/` adicionado para versionamento.

## Variáveis de Ambiente

| Variável | Obrigatória | Default | Descrição |
|----------|-------------|---------|-----------|
| `MONGODB_URI` | Sim | — | Connection string do MongoDB Atlas |
| `MONGODB_DB_NAME` | Não | `finplan` | Nome do banco de dados |
| `API_SECRET_KEY` | Não | *(vazio = modo aberto)* | Chave de autenticação da API |
| `PORT` | Não | `8080` | Porta do servidor HTTP |

## Como Rodar

### Opção 1: Docker Compose (recomendado)

Na **raiz do monorepo** (`fin-plan/`):

```bash
# Crie um .env na raiz com suas variáveis
echo "MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/" > .env

# Build e inicia
docker compose up --build

# Em background
docker compose up --build -d

# Parar
docker compose down
```

### Opção 2: `go run` (desenvolvimento local)

Requer Go 1.23+ instalado:

```bash
cd apps/api

# Crie um .env dentro de apps/api/ com suas variáveis
cat > .env <<EOF
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
MONGODB_DB_NAME=finplan
# API_SECRET_KEY=  (deixe vazio para modo aberto)
PORT=8080
EOF

# Rodar
go run ./cmd/api
```

### Opção 3: Build manual da imagem Docker

```bash
cd apps/api

# Build
docker build -t finplan-api .

# Rodar
docker run -p 8080:8080 \
  -e MONGODB_URI="mongodb+srv://..." \
  -e MONGODB_DB_NAME="finplan" \
  finplan-api
```

## Testando os Endpoints

```bash
# Health check
curl http://localhost:8080/api/v1/health

# GET Budget Years (lista anos disponíveis)
curl http://localhost:8080/api/v1/budget-years

# GET Year View Model (visão anual agregada)
curl http://localhost:8080/api/v1/budget-years/2026

# POST Budget Item (cria item atômico)
curl -X POST http://localhost:8080/api/v1/budget-items \
  -H "Content-Type: application/json" \
  -d '{"name":"Aluguel","type":"fixa","values":{"2026-10":2500}}'
```

## Changelog

### ✅ Implementado (v2 — Domínio Normalizado & Escrita Atômica)

- [x] **Domínio Normalizado**: coleções `budget_years`, `months`, `budget_items`, `one_time_costs`, `goals`
- [x] **Auto-indexing Inicial**: verificação e criação de índices únicos e de chave estrangeira na inicialização do servidor
- [x] **Agregação Anual**: `GET /api/v1/budget-years/{year}` com join server-side em Go gerando `YearViewModel`
- [x] **CRUD Atômico**: endpoints REST com UUIDv4 para itens, custos pontuais e metas
- [x] **Aportes Atômicos**: `$push` e `$pull` em `goals` sem reescrever o orçamento
- [x] **Simulação por Ano**: `PATCH /api/v1/budget-years/{year}` com premissas anuais
- [x] **Testes Automatizados em Go**: cobertura de handlers, services e mocks de repositório em todas as entidades
- [x] **Eliminação de Legado**: remoção completa de endpoints monolíticos legados (`/api/v1/budget`)

### ✅ Implementado (v1 — Fundação Go)

- [x] `GET /api/v1/budget` — leitura do documento único `default_budget`
- [x] `POST /api/v1/budget` — upsert atômico com `updateOne + upsert: true`
- [x] `GET /api/v1/health` — health check
- [x] Autenticação por API key (header `x-api-key` ou `Authorization: Bearer`)
- [x] CORS com headers idênticos ao contrato existente (`GET, OPTIONS, POST, PATCH, DELETE`)
- [x] Graceful shutdown (SIGTERM/SIGINT)
- [x] Timeouts explícitos no MongoDB (8s) e no servidor HTTP (15s)
- [x] Dockerfile multi-stage (golang:1.23-alpine → distroless/static)
- [x] docker-compose.yml na raiz do monorepo
- [x] Configuração 12-factor via env vars + `.env` para dev
