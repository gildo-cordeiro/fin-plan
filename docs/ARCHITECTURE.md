# 🏛️ FinPlan — Arquitetura do Sistema (PostgreSQL + React SPA)

Este documento detalha o funcionamento interno, as decisões de engenharia e os padrões arquiteturais do **FinPlan**, uma aplicação de planejamento financeiro pessoal de alta precisão baseada em uma arquitetura **100% Backend Relacional no PostgreSQL com UI Reativa Otimista (React + TypeScript)**.

---

## 1. Visão Geral da Arquitetura

O FinPlan opera com clara separação de responsabilidades:
1. **Frontend SPA (apps/web)**: React 18 + Vite + Tailwind CSS. Interface reativa com **0ms de latência percebida** através de **atualizações otimistas**: cada edição atualiza o estado local imediatamente, disparando a requisição atômica em paralelo. Em caso de falha de rede ou validação, o estado reverte automaticamente ao valor prévio (rollback) e notifica o usuário via Toast.
2. **Backend REST (apps/api)**: Go 1.24+ servido via HTTP Mux nativo com middlewares de autenticação (API Key) e CORS.
3. **Persistência Relacional (PostgreSQL)**: Modelo relacional normalizado (`budget`, `item`, `entry`, `cost`, `cost_item`, `goal`, `goal_contribution`, `reserve_movement`).
4. **Resumo e Window Functions**: O backend calcula os totais agregados mensais e acumulados via SQL (`GET /api/v1/budgets/{year}/summary`), servindo como única fonte da verdade de saldos reais.

---

## 2. Diagrama de Fluxo e Persistência

```mermaid
flowchart TD
    subgraph Browser["Cliente Web SPA (apps/web)"]
        User(["Usuário"]) -->|Edita planejado / Confirma realizado / Cria item| UI["Componentes React (Views & Modals)"]
        UI -->|Dispara Ação| Context["BudgetContext (React Context & Hooks)"]
        
        Context -->|1. Atualização Otimista (0ms)| LocalState["Estado em Memória (React State)"]
        LocalState -->|2. Aplica Simulação Client-side| MathEngine["budgetCalculator.ts (calculateBudget)"]
        MathEngine -->|3. UI Atualizada Imediatamente| UI
        
        Context -->|4. Chamada HTTP Atômica (com Rollback)| Sync["budgetApiService.ts"]
    end

    subgraph BackendAPI["Backend REST Go (apps/api)"]
        Sync -->|5. PATCH/POST/DELETE /api/v1/*| GoServer["cmd/api/main.go (HTTP Mux)"]
        GoServer -->|6. Middleware CORS + Auth (x-api-key)| AuthCheck{"Validação de Acesso"}
        AuthCheck -->|7. Handlers & Services Granulares| PgxPool["Conexão PostgreSQL (pgx / database/sql)"]
    end

    subgraph RelationalDB["Banco de Dados Relacional (PostgreSQL)"]
        PgxPool -->|8. Escrita Atômica e Consultas Agregadas| Postgres[("PostgreSQL: budget, item, entry, cost, cost_item, goal, reserve_movement")]
    end

    %% Fluxo de Leitura / Resumo
    Browser -.->|GET /api/v1/budgets/{year} + GET /summary| GoServer
    Postgres -.->|Window functions para saldo acumulado| GoServer
    GoServer -.->|BudgetSummary consolidado| Context
```

---

## 3. Decisões Arquiteturais Fundamentais

### 3.1. Persistência 100% Backend sem Cache Local de Dados
- **Decisão**: `localStorage` armazena exclusivamente percentuais do simulador (`varsPercent`, `rendaPercent`, `oneTimeMarginPercent`) e preferências visuais (`theme`, `currentYear`) no **Schema v5**.
- **Por quê**: Armazenar dados financeiros no navegador gerava inconsistências entre dispositivos, problemas de sincronização bidirecional e perda de dados acidental. Ao centralizar dados no PostgreSQL, a nuvem é a fonte única da verdade.

### 3.2. Atualizações Otimistas com Rollback Automático e Toast
- **Decisão**: Todas as ações do usuário aplicam a modificação no React State no instante zero (0ms), registrando uma função de rollback. Se o backend responder com erro, o estado é restaurado e uma notificação de erro é exibida.
- **Por quê**: Permite fluxo de digitação sem atrito ou travamentos de tela em conexões de alta latência, garantindo consistência com o backend.

### 3.3. Modelo Conceitual: Planejado vs. Realizado (`entry`)
- **Decisão**: Cada item recorrente possui 12 `entry` (meses 1 a 12). Cada entry contém:
  - `planned_amount`: valor orçado/previsto
  - `actual_amount`: valor efetivamente realizado/pago
  - `paid_date`: data em que o lançamento foi liquidado (sua presença marca o item como "confirmado")
- **Por quê**: Substitui a modelagem flat legada e permite que o usuário faça acompanhamento mensal real contra o que foi planejado no início do ano.

### 3.4. Projetos de Custo Pontual Hierárquicos (`cost` e `cost_item`)
- **Decisão**: Custos pontuais são modelados como projetos com N itens (`cost_item`). Cada projeto define sua própria `margin_percent` (margem de imprevistos) e um `default_month` opcional. Cada item do projeto pode herdar o mês do projeto ou sobrescrever seu próprio mês.
- **Por quê**: Gastos não recorrentes complexos (como mudanças, reformas ou casamentos) envolvem múltiplos fornecedores e pagamentos parcelados ao longo de meses diferentes, mantendo controle de margem por projeto.

### 3.5. Reserva de Emergência como Livro-Razão Imutável (`reserve_movement`)
- **Decisão**: A entidade `reserve_movement` só aceita `POST` (inserção) e `GET` (listagem). Não existem rotas de `PATCH` ou `DELETE`.
- **Por quê**: Uma reserva de emergência requer integridade contábil estrita. Corrigir um valor exige registrar uma nova movimentação compensatória de sinal inverso, mantendo a trilha de auditoria completa.

### 3.6. Resumo Mensal Server-side via Window Functions
- **Decisão**: `GET /api/v1/budgets/{year}/summary` calcula receitas, cartões, fixas, variáveis, custos pontuais e saldo acumulado (`SUM(...) OVER (ORDER BY month) + initial_balance`) diretamente no banco de dados.
- **Por quê**: Garante precisão decimal (NUMERIC 12,2) em conformidade contábil, sem divergências de arredondamento de ponto flutuante no JavaScript do navegador.

---

## 4. Estrutura do Monorepo

```text
fin-plan/
├── docker-compose.yml           # Orquestração de containers da API Go e PostgreSQL
├── .env.example                 # Exemplo de variáveis de ambiente
│
├── apps/
│   ├── web/                     # 📦 Frontend React 18 SPA (Vite + Tailwind)
│   │   ├── src/
│   │   │   ├── components/      # Componentes de UI, Views e Modals
│   │   │   ├── context/         # BudgetContext (optimistic updates) e ToastContext
│   │   │   ├── services/        # budgetApiService, budgetCalculator, storageService v5
│   │   │   ├── types/           # Interfaces TypeScript fiéis ao schema PostgreSQL
│   │   │   └── utils/           # Formatadores e geradores de mês
│   │   └── package.json
│   │
│   └── api/                     # 📦 Backend Go REST API
│       ├── cmd/api/main.go      # Inicialização do servidor HTTP e rotas
│       ├── internal/            # Domínios: budget, item, entry, cost, costitem, goal, reserve
│       └── Dockerfile           # Imagem enxuta de produção
│
└── docs/
    ├── adrs/                    # 📜 Registros de Decisões Arquiteturais (ADRs)
    ├── API.md                   # Contratos de rotas e especificações JSON da API
    └── ARCHITECTURE.md          # Este documento
```

---

## 5. Registros de Decisões Arquiteturais (ADRs)

Para um histórico detalhado, contexto de decisão e trade-offs formais de engenharia, consulte o diretório [`docs/adrs/`](./adrs/README.md):
- [ADR-0001: Monorepo com Deploys Desacoplados](./adrs/0001-arquitetura-monorepo-com-deploys-desacoplados.md)
- [ADR-0002: Migração NoSQL para PostgreSQL Relacional](./adrs/0002-migracao-de-nosql-para-postgresql-relacional.md)
- [ADR-0003: Interface Reativa com Atualizações Otimistas](./adrs/0003-interface-reativa-com-atualizacoes-otimistas.md)
- [ADR-0004: Modelo Planejado vs. Realizado em Entries Mensais](./adrs/0004-modelo-planejado-vs-realizado-em-entries-mensais.md)
- [ADR-0005: Projetos Hierárquicos de Custos Pontuais com Margem](./adrs/0005-projetos-hierarquicos-de-custos-pontuais-com-margem.md)
- [ADR-0006: Reserva de Emergência como Livro-Razão Imutável](./adrs/0006-reserva-de-emergencia-como-livro-razao-imutavel.md)
- [ADR-0007: Cálculos Agregados e Saldo Acumulado Server-Side](./adrs/0007-calculos-agregados-e-saldo-acumulado-server-side.md)
- [ADR-0008: Semântica de PATCH Parcial Estrita](./adrs/0008-semantica-de-patch-parcial-estrita.md)
- [ADR-0009: Estratégia de Identificadores (UUIDv4 vs Chave Natural)](./adrs/0009-estrategia-de-identificadores-uuidv4-e-chaves-naturais.md)

