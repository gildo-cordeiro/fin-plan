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
│   │   ├── app.go               # Application bootstrap (centraliza banco, DI, rotas, shutdown)
│   │   └── app_test.go          # Testes unitários do ciclo de vida da aplicação
│   ├── budget/                  # Orçamentos
│   ├── config/                  # Leitura de env vars (12-factor)
│   ├── cost/                    # Custos
│   ├── costitem/                # Itens de custos
│   ├── entry/                   # Entradas
│   ├── goal/                    # Metas financeiras e contribuições
│   ├── httputil/                # Respostas padronizadas (WriteJSON/WriteError) e UUIDv4
│   ├── item/                    # Itens orçamentários
│   ├── middleware/
│   │   ├── auth.go              # API key (x-api-key / Authorization: Bearer)
│   │   └── cors.go              # Headers CORS
│   └── reserve/                 # Movimentações de reserva
├── migrations/                  # Migrações Goose (PostgreSQL)
├── Dockerfile                   # Multi-stage build (golang:1.27-alpine → distroless)
├── go.mod / go.sum
└── README.md                    # Este arquivo
```

## Endpoints

Os endpoints REST da API estão documentados em [`docs/API.md`](../../docs/API.md) e incluem:
- `/api/v1/budgets`
- `/api/v1/items`
- `/api/v1/entries`
- `/api/v1/costs`
- `/api/v1/goals`
- `/api/v1/reserve-movements`

O contrato de request/response (campos, status codes, mensagens de erro) é idêntico ao documentado em `docs/API.md`.

## Variáveis de Ambiente

| Variável | Obrigatória | Default | Descrição |
|----------|-------------|---------|-----------|
| `DATABASE_URL` | Sim | — | Connection string do PostgreSQL |
| `API_SECRET_KEY` | Não | *(vazio = modo aberto)* | Chave de autenticação da API |
| `PORT` | Não | `8080` | Porta do servidor HTTP |

## Como Rodar

### Opção 1: Docker Compose (recomendado)

Na **raiz do monorepo** (`fin-plan/`):

```bash
# Build e inicia (o db PostgreSQL sobe junto)
docker compose up --build

# Em background
docker compose up --build -d

# Parar
docker compose down
```

### Opção 2: `go run` (desenvolvimento local)

Requer Go 1.27 instalado:

```bash
cd apps/api

# Crie um .env dentro de apps/api/ com suas variáveis
cat > .env <<EOF
DATABASE_URL=postgres://finplan:finplan@localhost:5432/finplan?sslmode=disable
# API_SECRET_KEY=  (deixe vazio para modo aberto)
PORT=8080
EOF

# Rodar as migrações Goose
goose -dir migrations postgres "postgres://finplan:finplan@localhost:5432/finplan?sslmode=disable" up

# Rodar o servidor
go run ./cmd/api
```

### Opção 3: Build manual da imagem Docker

```bash
cd apps/api

# Build
docker build -t finplan-api .

# Rodar
docker run -p 8080:8080 \
  -e DATABASE_URL="postgres://..." \
  finplan-api
```
