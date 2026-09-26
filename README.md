# 💸 FinPlan — Planejador Financeiro Pessoal

FinPlan é uma aplicação web moderna de planejamento financeiro pessoal de alta precisão, desenvolvida com React 18, TypeScript, Vite e Tailwind CSS. Projetada sob o paradigma **Local-First**, combina resposta instantânea de interface (0ms de latência percebida) com persistência em nuvem no **MongoDB Atlas** via API Serverless.

O sistema permite navegar e projetar o fluxo de caixa em horizontes flexíveis de 1 a 60 meses (com presets de 3, 6, 12 e 24 meses), simular cenários de sensibilidade ("E se...") em tempo real e monitorar a integridade da reserva de emergência e metas financeiras.

---

## 🚀 Badges & Stack Tecnológica

| Camada | Tecnologias Principais |
|---|---|
| **Frontend** | React 18.3.1, TypeScript 5.6.3, Vite 5.4.11, Tailwind CSS 3.4.15, Lucide React 0.460.0 |
| **Backend (Serverless)** | Node.js, Vercel Serverless Functions (`api/budget.ts`), MongoDB Node Driver 6.10.0 |
| **Banco de Dados & Cache** | MongoDB Atlas (`default_budget`), Web Storage (`localStorage` v4) |
| **Testes** | Vitest 2.1.9 (Unitários/Integração), Playwright 1.63.0 (E2E) |
| **Hospedagem & Deploy** | Vercel (`vercel.json`) com rewrites para SPA |

---

## 📋 Pré-requisitos

- **Node.js**: Versão `>= 18.0.0` (recomendado Node 20 LTS ou superior).
- **npm**: Versão `>= 9.0.0` (acompanha a instalação do Node).
- **MongoDB Atlas**: Cluster configurado com usuário e senha com permissão de leitura/escrita na coleção `budgets`.
- **Navegador moderno**: Chrome, Edge, Firefox ou Safari com suporte a Web Crypto API (`crypto.randomUUID`).

---

## ⚙️ Instalação e Configuração

### 1. Clonar o repositório
```bash
git clone https://github.com/gildo-cordeiro/fin-plan.git
cd fin-plan
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente
Copie o arquivo de exemplo para `.env`:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:
```ini
# String de conexão do cluster MongoDB Atlas (obrigatória para sincronização em nuvem)
MONGODB_URI=mongodb+srv://<user>:<password>@cluster-01.kpiykbg.mongodb.net/?appName=cluster-01

# Nome do banco de dados (opcional, padrão: finplan)
MONGODB_DB_NAME=finplan

# Chave secreta de autenticação da API (opcional localmente, recomendada em produção)
# Caso definida, exige o header x-api-key nas chamadas à API
API_SECRET_KEY=sua-chave-secreta-aqui
VITE_API_SECRET_KEY=sua-chave-secreta-aqui
```

> [!NOTE]
> No ambiente de desenvolvimento local, o Vite carrega automaticamente `MONGODB_URI` e `MONGODB_DB_NAME` via `vite.config.ts` através de um middleware embutido que emula a função serverless sem necessidade do Vercel CLI.

---

## 💻 Como Rodar o Projeto

### Modo de Desenvolvimento
Inicia o servidor de desenvolvimento Vite com hot-reload e emulação do endpoint `/api/budget`:
```bash
npm run dev
```
Acesse a aplicação no navegador em: `http://localhost:5173`.

### Executar Testes Unitários e de Integração
Executa a suíte de 37 testes automatizados com Vitest:
```bash
npm test
```

### Executar Testes End-to-End (E2E)
Executa a suíte de testes com Playwright (sobe o servidor de desenvolvimento automaticamente se não estiver em execução):
```bash
npm run test:e2e
```

### Compilar para Produção (Typecheck + Build)
Valida a tipagem estrita com TypeScript (`tsc`) e gera os assets minificados e otimizados na pasta `dist/`:
```bash
npm run build
```

### Visualizar Build Localmente
Executa uma prévia do bundle compilado em `dist/`:
```bash
npm run preview
```

### Migração de Dados Legados (CSV → MongoDB)
Converte e envia registros da planilha CSV original diretamente para o MongoDB Atlas:
```bash
npm run migrate:mongo
```

---

## 📜 Scripts Disponíveis

Todos os comandos configurados no [`package.json`](file:///home/gildo-duarte/Documentos/Projects/fin-plan/package.json):

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor Vite na porta `5173` com middleware SSR para `/api/budget`. |
| `npm run build` | Roda `tsc` (typecheck estrito) e `vite build` gerando arquivos em `dist/`. |
| `npm run preview` | Inicia servidor local de visualização da pasta `dist/`. |
| `npm test` | Executa a suíte completa de testes unitários com `vitest run`. |
| `npm run test:e2e` | Executa os testes de interface ponta a ponta com `playwright test`. |
| `npm run migrate:mongo` | Executa o script Node.js [`scripts/migrate.js`](file:///home/gildo-duarte/Documentos/Projects/fin-plan/scripts/migrate.js) para carga inicial no MongoDB. |

---

## 📁 Estrutura de Pastas

Estrutura resumida de 2 níveis do projeto:

```
fin-plan/
├── api/                  # Funções serverless Vercel (endpoint /api/budget para MongoDB Atlas)
├── docs/                 # Documentação técnica (arquitetura, contratos de API e guias)
├── e2e/                  # Testes ponta a ponta herméticos com Playwright
├── scripts/              # Scripts utilitários de manutenção e migração de banco de dados
├── src/                  # Código-fonte da aplicação React
│   ├── __tests__/        # Testes unitários com Vitest (cálculos, formatadores, storage, API)
│   ├── components/       # Componentes React organizados por domínio (budget, dashboard, layout, etc.)
│   ├── constants/        # Enums de categorias/status, definições visuais e seed inicial
│   ├── context/          # Contextos globais (BudgetContext para estado/sync e ToastContext para avisos)
│   ├── hooks/            # Hooks de orquestração e memoização reativa de cálculos
│   ├── services/         # Serviços de negócio puros (cálculos matemáticos, storage local e API HTTP)
│   ├── types/            # Definições de tipos e interfaces TypeScript do domínio financeiro
│   └── utils/            # Utilitários de formatação de moedas/datas pt-BR e gerador UUIDv4
└── .agents/              # Base de conhecimento e skills operacionais para agentes de IA
    └── skills/           # Padrões arquiteturais, convenções de código e fluxos de trabalho
```

---

## 📚 Documentação Adicional

- 🏛️ **[Arquitetura do Sistema](docs/ARCHITECTURE.md)**: Visão geral detalhada, diagrama Mermaid de sincronização local-first, modelo de dados, decisões arquiteturais e limitações.
- 🔌 **[Contrato da API](docs/API.md)**: Especificação completa dos métodos, headers, payloads e respostas do endpoint `/api/budget`.
- 🤖 **Skills & Padrões Operacionais (`.agents/skills/`)**:
  - [`backend-patterns.md`](.agents/skills/backend-patterns.md): Padrões de conexão singleton MongoDB, tratamento de erros e serverless functions.
  - [`frontend-patterns.md`](.agents/skills/frontend-patterns.md): Design system Tailwind, tipografia tabular, isolamento de componentes e estado reativo.
  - [`git-workflow.md`](.agents/skills/git-workflow.md): Padrão de branches, Conventional Commits e validações antes de PRs.
  - [`full-stack-task.md`](.agents/skills/full-stack-task.md): Guia prático para desenvolvimento de features ponta a ponta com segurança e TDD.

---

## 🤝 Contribuição e Licença

Este projeto é de uso pessoal e privado (`"private": true` no `package.json`).

Para colaborar no desenvolvimento:
1. Crie uma branch temática a partir de `main`: `git checkout -b feat/nome-da-funcionalidade`.
2. Siga as convenções de commits descritas em [`.agents/skills/git-workflow.md`](.agents/skills/git-workflow.md).
3. Certifique-se de que `npm test`, `npm run build` e `npm run test:e2e` passem sem avisos antes de abrir um Pull Request.
