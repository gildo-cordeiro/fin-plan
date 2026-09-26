# 💸 FinPlan — Planejador Financeiro Pessoal (Monorepo)

FinPlan é uma aplicação web moderna de planejamento financeiro pessoal de alta precisão, desenvolvida com React 18, TypeScript, Vite, Tailwind CSS e Go. Projetada sob o paradigma **Local-First**, combina resposta instantânea de interface (0ms de latência percebida) com persistência em nuvem atômica no **MongoDB Atlas** através de uma API REST de alta performance desenvolvida em Go.

O repositório adota arquitetura de **Monorepo** com deploys completamente desacoplados entre frontend SPA e backend containerizado.

---

## 🚀 Badges & Stack Tecnológica

| Camada | Tecnologias Principais | Localização |
|---|---|---|
| **Monorepo** | Docker Compose | Raiz (`/`) |
| **Frontend Web** | React 18.3.1, TypeScript 5.6.3, Vite 5.4.11, Tailwind CSS 3.4.15, Lucide React | [`apps/web/`](apps/web/) |
| **Backend REST** | Go 1.27, `net/http` nativo, MongoDB Go Driver 1.17, Docker Distroless | [`apps/api/`](apps/api/) |
| **Banco de Dados & Cache** | MongoDB Atlas (`default_budget`), Web Storage (`localStorage` v4) | Nuvem / Navegador |
| **Testes** | Vitest 2.1.9 (Unitários), Playwright 1.63.0 (E2E) | [`apps/web/`](apps/web/) |
| **Deploy Frontend** | Vercel (SPA estática) | Independente |
| **Deploy Backend** | Container Docker Distroless (`apps/api/Dockerfile`) | Independente (Cloud Run, Fly.io, Railway, etc.) |

---

## 📁 Estrutura do Monorepo

```text
fin-plan/
├── docker-compose.yml         # Orquestração local do backend Go (apps/api)
├── .env.example               # Template centralizado de variáveis de ambiente
├── .gitignore                 # Regras unificadas de exclusão Git
├── README.md                  # Este documento
│
├── apps/
│   ├── web/                   # 📦 Frontend React SPA
│   │   ├── vercel.json        # Configuração para deploy estático na Vercel
│   │   ├── package.json       # Dependências específicas do frontend
│   │   ├── vite.config.ts     # Proxy de dev para http://localhost:8080
│   │   ├── tsconfig.json      # Configuração TypeScript estrita
│   │   ├── src/               # Código-fonte React (componentes, hooks, context)
│   │   ├── e2e/               # Testes ponta a ponta herméticos (Playwright)
│   │   └── scripts/           # Scripts de migração de dados legados
│   │
│   └── api/                   # 📦 Backend Go API REST
│       ├── Dockerfile         # Multi-stage distroless ultraleve (~20MB)
│       ├── go.mod             # Módulo Go (github.com/gildo-cordeiro/fin-plan/apps/api)
│       ├── cmd/api/main.go    # Entrypoint HTTP, graceful shutdown e pool MongoDB
│       ├── internal/          # Domínio de orçamento, repositório e middlewares
│       └── README.md          # Documentação específica da API Go
│
├── docs/                      # 📚 Documentação Técnica Compartilhada
│   ├── ARCHITECTURE.md        # Arquitetura Local-First, diagramas e modelo de dados
│   └── API.md                 # Contrato formal da API REST (/api/v1/budget)
│
└── .agents/                   # 🤖 Diretrizes e Skills operacionais para agentes IA
    └── skills/
        └── finplan-feature-implementation/
```

---

## 📋 Pré-requisitos

- **Node.js**: Versão `>= 18.0.0` (recomendado Node 20 LTS ou superior, para rodar `apps/web`)
- **npm**: Versão `>= 9.0.0`
- **Docker & Docker Compose**: Recomendado para rodar a API Go localmente sem precisar instalar Go
- **Go**: Versão `>= 1.24` (opcional, apenas se quiser compilar a API Go nativamente fora do Docker)
- **MongoDB Atlas**: Cluster configurado com string de conexão válida

---

## ⚙️ Instalação e Configuração

### 1. Clonar o repositório
```bash
git clone https://github.com/gildo-cordeiro/fin-plan.git
cd fin-plan
```

### 2. Instalar dependências do Frontend (em `apps/web`)
```bash
cd apps/web
npm install
cd ../..
```

### 3. Configurar variáveis de ambiente
Copie o arquivo `.env.example` da raiz para `.env`:
```bash
cp .env.example .env
```

Edite as credenciais:
```ini
# Backend Go
MONGODB_URI=mongodb+srv://<usuario>:<senha>@cluster-01.kpiykbg.mongodb.net/?appName=cluster-01
MONGODB_DB_NAME=finplan
PORT=8080
API_SECRET_KEY=sua-chave-secreta-aqui

# Frontend Web
VITE_API_SECRET_KEY=sua-chave-secreta-aqui
# VITE_API_URL=http://localhost:8080  # Opcional (o proxy do Vite já encaminha /api em dev)
```

---

## 💻 Como Rodar o Projeto

### Fluxo Recomendado de Desenvolvimento:

#### 1. Iniciar o Backend (API Go)
Na raiz do projeto, suba a API via Docker Compose:
```bash
docker compose up --build
```
> Ou em segundo plano: `docker compose up -d`. Se tiver Go instalado nativamente: `cd apps/api && go run ./cmd/api`.

A API estará disponível em `http://localhost:8080` (healthcheck em `http://localhost:8080/api/v1/health`).

#### 2. Iniciar o Frontend (Vite Dev Server)
Em outro terminal:
```bash
cd apps/web
npm run dev
```
O frontend iniciará em `http://localhost:5173`. O Vite faz proxy automático de qualquer chamada `/api/*` diretamente para a API Go em `http://localhost:8080`.

---

## 🧪 Testes e Validação do Frontend (em `apps/web`)

```bash
cd apps/web

# Executar suíte de testes unitários (Vitest)
npm test

# Executar verificação de tipos e compilação de produção
npm run build

# Executar testes ponta a ponta (Playwright)
npm run test:e2e
```

---

## 📜 Scripts do Frontend (`apps/web/package.json`)

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor Vite de desenvolvimento com HMR |
| `npm run build` | Executa typecheck estrito (`tsc`) e build de produção (`vite build`) |
| `npm test` | Roda todos os testes unitários com Vitest |
| `npm run test:e2e` | Roda os testes end-to-end com Playwright |
| `npm run preview` | Visualiza o build de produção localmente |

---

## 🚀 Estratégia de Deploy Independente

### Frontend (`apps/web`)
- **Vercel**: Configure a raiz do projeto na Vercel como `apps/web` e o comando de build como `npm run build` (pasta de saída `dist`). O arquivo `apps/web/vercel.json` garante o roteamento da SPA.
- Nas configurações de variáveis da Vercel, adicione `VITE_API_URL` apontando para a URL pública onde sua API Go estiver hospedada (ou configure um rewrite no `vercel.json`).

### Backend Go (`apps/api`)
- **Render / Fly.io / Google Cloud Run / Railway / VPS**:
  - Compile a imagem a partir de `apps/api/Dockerfile`.
  - Imagem baseada em `gcr.io/distroless/static:nonroot`, segura, sem binários shell e pesando ~20 MB.
  - Configure as variáveis `MONGODB_URI`, `MONGODB_DB_NAME`, `PORT` e `API_SECRET_KEY`.

---

## 🤖 GitHub Actions (Workflows Manuais e CI)

O repositório possui workflows com gatilho manual (`workflow_dispatch`), permitindo acionar deploys ou validações diretamente pela aba **Actions** no GitHub:

| Workflow | Arquivo | Gatilho | Descrição |
|---|---|---|---|
| **Deploy Web (Vercel)** | [`.github/workflows/deploy-web.yml`](.github/workflows/deploy-web.yml) | Manual (`workflow_dispatch`) | Testa e faz o deploy do `apps/web` na Vercel (Production ou Preview). |
| **Deploy API (Render)** | [`.github/workflows/deploy-api.yml`](.github/workflows/deploy-api.yml) | Manual (`workflow_dispatch`) | Dispara o Deploy Hook no Render para recompilar e subir a API Go. |
| **CI (Testes & Build)** | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | Push / PR / Manual | Executa testes e typecheck do Frontend e compilação da API Go. |

### Configuração de Secrets no GitHub (`Settings -> Secrets and variables -> Actions`):
- Para o **Deploy Web (Vercel)**:
  - `VERCEL_TOKEN`: Token pessoal de acesso da Vercel (*Account Settings -> Tokens*).
  - `VERCEL_ORG_ID`: ID do time ou conta na Vercel.
  - `VERCEL_PROJECT_ID`: ID do projeto do frontend na Vercel.
- Para o **Deploy API (Render)**:
  - `RENDER_DEPLOY_HOOK_URL`: URL do Deploy Hook gerada no painel do Render (*Settings -> Deploy Hook*).

---

## 📚 Documentação Complementar

- 🏛️ **[Arquitetura do Sistema](docs/ARCHITECTURE.md)**: Detalhamento Local-First, diagrama Mermaid de persistência, modelo de dados e decisões de engenharia.
- 🔌 **[Especificação da API](docs/API.md)**: Contratos de endpoints `/api/v1/*`, payloads, cabeçalhos de autenticação e códigos de resposta.
