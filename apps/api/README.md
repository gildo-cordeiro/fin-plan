# 🚀 FinPlan Backend Go

Backend API em Go para o FinPlan, substituindo a função serverless Vercel (`api/budget.ts`) por uma aplicação containerizada — pronta para rodar em qualquer plataforma que aceite containers Docker.

## Arquitetura

```
api/
├── cmd/
│   └── api/
│       └── main.go              # Bootstrap: config, MongoDB, router, graceful shutdown
├── internal/
│   ├── budget/
│   │   ├── handler.go           # GET/POST /api/v1/budget
│   │   ├── repository.go        # Camada de acesso ao MongoDB (isolada)
│   │   └── model.go             # Structs Go ≡ BudgetState do TypeScript
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

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/v1/budget` | Retorna o documento `default_budget` (`{ exists, data, updatedAt }`) |
| `POST` | `/api/v1/budget` | Upsert atômico do `BudgetState` completo |
| `OPTIONS` | `/api/v1/budget` | Preflight CORS (200 imediato) |
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

# GET budget (sem auth no modo aberto)
curl http://localhost:8080/api/v1/budget

# GET budget (com auth)
curl -H "x-api-key: SUA_CHAVE" http://localhost:8080/api/v1/budget

# POST budget
curl -X POST http://localhost:8080/api/v1/budget \
  -H "Content-Type: application/json" \
  -H "x-api-key: SUA_CHAVE" \
  -d '{"version":5,"months":[],"simulation":{"varsPercent":0,"rendaPercent":0,"oneTimeMarginPercent":0,"initialBalance":0,"emergencyReserve":0},"incomes":[],"lists":{"cartoes":[],"fixas":[],"vars":[]},"oneTimeCosts":[],"goals":[]}'
```

## Changelog

### ✅ Implementado (v1)

- [x] `GET /api/v1/budget` — leitura do documento único `default_budget`
- [x] `POST /api/v1/budget` — upsert atômico com `updateOne + upsert: true`
- [x] `GET /api/v1/health` — health check
- [x] Autenticação por API key (header `x-api-key` ou `Authorization: Bearer`)
- [x] CORS com headers idênticos ao contrato existente
- [x] Graceful shutdown (SIGTERM/SIGINT)
- [x] Timeouts explícitos no MongoDB (8s) e no servidor HTTP (15s)
- [x] Dockerfile multi-stage (golang:1.23-alpine → distroless/static)
- [x] docker-compose.yml na raiz do monorepo
- [x] Structs Go compatíveis campo-a-campo com o `BudgetState` TypeScript
- [x] Mensagens de erro em português, idênticas ao `docs/API.md`
- [x] Configuração 12-factor via env vars + `.env` para dev

### 🔜 Pendente (próximas iterações)

- [ ] **Especificação OpenAPI/Swagger** — gerar spec para o contrato `/api/v1/*` (permitirá gerar client Retrofit/OkHttp do Android automaticamente)
- [ ] **Definir plataforma de deploy** — Cloud Run, Fly.io, Railway ou VPS
- [ ] **Migração de tráfego** — redirecionar o frontend do endpoint Vercel para o Go backend (decisão manual após validação)
- [ ] **Testes automatizados em Go** — unit tests para handlers e repository
- [ ] **Multi-tenancy (userId)** — a camada de Repository já está preparada para filtrar por `userId` sem alterar handlers
- [ ] **CI/CD** — GitHub Actions para build, test e push da imagem Docker
