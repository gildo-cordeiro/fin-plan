# 🏛️ FinPlan — Arquitetura do Sistema

Este documento detalha o funcionamento interno, as decisões de engenharia e os padrões arquiteturais do **FinPlan**, uma aplicação de planejamento financeiro pessoal de alta precisão baseada em uma arquitetura **Local-First reativa com persistência atômica no MongoDB Atlas via API Serverless**.

---

## 1. Visão Geral da Arquitetura

O FinPlan adota o paradigma **Local-First**: toda interação do usuário é refletida instantaneamente no estado local em memória e espelhada no `localStorage` do navegador com 0ms de latência percebida, enquanto um motor matemático puro calcula projeções de fluxo de caixa e sensibilidade em tempo real; em segundo plano, um timer de debounce de **500ms** consolida e envia o estado completo da aplicação de forma atômica para um documento único no **MongoDB Atlas** através de uma função **Vercel Serverless** (`/api/budget`), garantindo tolerância a falhas de rede, resiliência offline e consistência entre dispositivos sem a complexidade de transações distribuídas.

---

## 2. Diagrama de Fluxo e Persistência

O fluxo de dados da aplicação abrange três camadas essenciais: interação reativa no navegador, persistência síncrona local e sincronização assíncrona com nuvem:

```mermaid
flowchart TD
    subgraph Browser["Cliente Web (Navegador)"]
        User(["Usuário"]) -->|Edita valor / Adiciona item / Move slider| UI["Componentes React (Views & Modals)"]
        UI -->|Dispara Action| Context["BudgetContext (React Context & Hooks)"]
        
        Context -->|1. Atualização Instantânea (0ms)| LocalState["Estado em Memória (React State)"]
        Context -->|2. Espelho Offline Imediato (0ms)| LocalStorage[("LocalStorage (finplan-app-data-v4)")]
        
        LocalState -->|3. Recálculo Puro (0ms)| MathEngine["budgetCalculator.ts (calculateBudget)"]
        MathEngine -->|4. Projeções e Métricas Atualizadas| UI
        
        Context -->|5. Timer de Debounce (500ms)| SyncQueue{"Debounce 500ms"}
    end

    subgraph ServerlessAPI["Camada Serverless (Vercel)"]
        SyncQueue -->|6. POST /api/budget (JSON State + x-api-key)| ServerlessFunc["api/budget.ts (Node.js Handler)"]
        ServerlessFunc -->|7. Valida API Key e Payload| AuthCheck{"Validação de Acesso"}
        AuthCheck -->|8. Conexão Singleton (MongoClient)| MongoDriver["Driver Oficial MongoDB (v6.10.0)"]
    end

    subgraph CloudDatabase["Persistência em Nuvem"]
        MongoDriver -->|9. Upsert Atômico (_id: default_budget)| AtlasDB[("MongoDB Atlas: database 'finplan', collection 'budgets'")]
    end

    %% Fluxo de Inicialização
    Browser -.->|GET /api/budget no carregamento inicial| ServerlessFunc
    AtlasDB -.->|Retorna estado persistido| ServerlessFunc
    ServerlessFunc -.->|Hydrate do estado remoto| Context
```

### Ciclo de Vida da Persistência:
1. **Edição**: Qualquer alteração (valor de receita, despesa, custo pontual, meta ou slider) muta o estado React imutável.
2. **Gravação Local**: O estado é imediatamente persistido no `localStorage` sob a chave `finplan-app-data-v4`.
3. **Cálculo Puro**: O hook [`useBudgetCalculations`](file:///home/gildo-duarte/Documentos/Projects/fin-plan/src/hooks/useBudgetCalculations.ts) reexecuta [`calculateBudget`](file:///home/gildo-duarte/Documentos/Projects/fin-plan/src/services/budgetCalculator.ts) gerando `monthlySummaries` e `metrics`.
4. **Debounce em Nuvem**: A alteração agenda a execução de [`budgetApiService.saveBudget`](file:///home/gildo-duarte/Documentos/Projects/fin-plan/src/services/budgetApiService.ts) em 500ms. Edições sucessivas durante esse intervalo cancelam o timer anterior (`clearTimeout`), consolidando apenas a versão final em um único `POST`.
5. **Carga Inicial e Reconexão**: Na inicialização, a aplicação tenta carregar os dados mais recentes do MongoDB Atlas via `GET /api/budget`. Caso não haja conexão ou o banco esteja vazio, o estado local é utilizado como fallback primário.

---

## 3. Decisões Arquiteturais Relevantes

### 3.1. Local-First vs. Server-First
- **Decisão**: A interface não aguarda respostas do servidor HTTP para renderizar novos valores ou confirmar inserções.
- **Por quê**: Em ferramentas de planejamento financeiro pessoal, o usuário realiza dezenas de edições por minuto ao balancear despesas e simular cenários. O atraso de requisições de rede (100ms a 500ms por clique) inviabilizaria a sensação de controle fluido. O espelho no `localStorage` permite o uso imediato e contínuo mesmo offline.

### 3.2. Serverless Function (`api/budget.ts`) vs. Monolito Backend
- **Decisão**: Endpoint único hospedado como Vercel Serverless Function em TypeScript/Node.js, complementado por um middleware em `vite.config.ts` no ambiente local.
- **Por quê**: Dispensa a manutenção de contêineres dedicados (Docker, Express, NestJS), reduz custos de infraestrutura a zero no modelo hobby/pessoal da Vercel e elimina atrito de deploy: o mesmo repositório compila o SPA estático e a rota de API.

### 3.3. Documento Único Atômico (`default_budget`) vs. Coleções Normalizadas
- **Decisão**: O estado financeiro completo (`BudgetState`) é persistido como um único documento BSON na coleção `budgets` (`_id: 'default_budget'`).
- **Por quê**:
  - Evita problemas de integridade relacional ou transações atômicas multi-documento (`session.withTransaction`) complexas no MongoDB.
  - Ao atualizar uma despesa ou reordenar meses, todo o orçamento é gravado de forma idempotente em uma única operação de `updateOne({ _id: 'default_budget' }, { $set: { data: body, updatedAt } }, { upsert: true })`.
  - O volume total de dados de um orçamento anual ou bienal é inferior a 100 KB, muito abaixo do limite rígido de 16 MB por documento no MongoDB.

### 3.4. Identificadores Únicos Universais (UUIDv4) vs. Slugs Determinísticos Legados
- **Decisão**: Toda entidade (`BudgetItem`, `OneTimeCost`, `FinancialGoal`, `GoalContribution`) possui um identificador único UUIDv4 gerado na criação via [`generateId()`](file:///home/gildo-duarte/Documentos/Projects/fin-plan/src/utils/idGenerator.ts) (`crypto.randomUUID()`).
- **Por quê**: Em versões legadas baseadas em planilhas, utilizavam-se chaves compostas como `despesa:aluguel`. Esse padrão gerava bugs quando o usuário renomeava uma categoria ou criava dois itens com o mesmo nome. O UUID desacopla o ciclo de vida e chaves de dados do nome visual.

---

## 4. Principais Módulos e Responsabilidades

```
fin-plan/
├── api/
│   └── budget.ts               # Handler serverless Vercel (GET, POST, OPTIONS) com pool MongoClient
├── src/
│   ├── types/                  # Interfaces do domínio financeiro (budget.ts) e enums
│   ├── constants/              # Metadados de categorias visuais, enums e estado inicial seed
│   ├── context/
│   │   ├── BudgetContext.tsx   # Estado global do orçamento, debounce de sync e despacho de ações
│   │   └── ToastContext.tsx    # Notificações visuais e ação de desfazer (Undo)
│   ├── services/
│   │   ├── budgetCalculator.ts # Motor matemático puro (fluxo de caixa, sobras, simulações)
│   │   ├── budgetApiService.ts # Cliente HTTP fetch com controle de timeout e headers de auth
│   │   └── storageService.ts   # Serialização local, controle de tema e migração de esquemas v3->v4
│   ├── hooks/
│   │   └── useBudgetCalculations.ts # Memoização eficiente dos cálculos matemáticos
│   ├── utils/
│   │   ├── formatters.ts       # Formatadores monetários pt-BR, parsing decimal e manipulação de meses
│   │   └── idGenerator.ts      # Gerador de UUIDv4 padrão RFC 4122
│   └── components/
│       ├── layout/             # Header com status do banco, NavMenu fixo e StatusBar de saldo
│       ├── budget/             # Visão mensal, custos pontuais e visão anual consolidada
│       ├── dashboard/          # Gráficos SVG interativos (Cashflow e barras de Renda x Despesas)
│       ├── simulation/         # Sliders de estresse financeiro ("E se...")
│       ├── goals/              # Metas de economia, histórico de aportes e vinculação de reserva
│       ├── months/             # Seletor de meses e barra de presets de horizonte temporal
│       ├── modals/             # Diálogos de transação, ajuste de saldo, metas e backup JSON
│       └── ui/                 # Componentes base reutilizáveis (CurrencyInput, Button, Card, Modal)
```

---

## 5. Modelo de Dados

O modelo de dados é centralizado em [`src/types/budget.ts`](file:///home/gildo-duarte/Documentos/Projects/fin-plan/src/types/budget.ts).

### Diagrama Entidade-Relacionamento (Conceitual)

```mermaid
erDiagram
    BUDGET_STATE ||--|{ MONTH_ITEM : contem
    BUDGET_STATE ||--|| SIMULATION_SETTINGS : possui
    BUDGET_STATE ||--|{ BUDGET_ITEM : "incomes"
    BUDGET_STATE ||--|{ BUDGET_ITEM : "lists.cartoes"
    BUDGET_STATE ||--|{ BUDGET_ITEM : "lists.fixas"
    BUDGET_STATE ||--|{ BUDGET_ITEM : "lists.vars"
    BUDGET_STATE ||--|{ ONE_TIME_COST : "oneTimeCosts"
    BUDGET_STATE ||--|{ FINANCIAL_GOAL : "goals"
    FINANCIAL_GOAL ||--|{ GOAL_CONTRIBUTION : "contributions"
    ONE_TIME_COST }o--|| MONTH_ITEM : "desembolso em (targetMonthId)"

    BUDGET_STATE {
        int version "5"
    }

    MONTH_ITEM {
        string id "PK (ex: 2026-10)"
        string name "Outubro 2026"
        string shortName "Out/26"
        int year "2026"
        int monthIndex "9"
    }

    BUDGET_ITEM {
        string id "PK (UUIDv4)"
        string name "Nome do item"
        string category "renda | cartoes | fixas | vars"
        json values "Record<monthId, number>"
        boolean off "Item inativo no cálculo"
        string notes "Observações opcionais"
        int dueDate "Dia de vencimento opcional"
    }

    ONE_TIME_COST {
        string id "PK (UUIDv4)"
        string name "Nome do custo"
        number value "Valor base"
        string targetMonthId "FK opcional para MonthItem"
        boolean off "Desativado no cálculo"
    }

    SIMULATION_SETTINGS {
        number varsPercent "Variação % de despesas variáveis"
        number rendaPercent "Variação % de rendas"
        number oneTimeMarginPercent "Margem % de custos pontuais"
        number initialBalance "Saldo em conta hoje"
        number emergencyReserve "Meta de reserva intocável"
    }

    FINANCIAL_GOAL {
        string id "PK (UUIDv4)"
        string name "Título da meta"
        number targetAmount "Valor pretendido"
        string status "ativa | concluida | pausada"
    }

    GOAL_CONTRIBUTION {
        string id "PK (UUIDv4)"
        string date "Data (YYYY-MM-DD)"
        number amount "Valor aportado"
        string note "Observação opcional"
    }
```

### Estrutura TypeScript do Estado:
```typescript
export interface BudgetState {
  version: number;
  months: MonthItem[];
  simulation: SimulationSettings;
  incomes: BudgetItem[];
  lists: {
    cartoes: BudgetItem[];
    fixas: BudgetItem[];
    vars: BudgetItem[];
  };
  oneTimeCosts: OneTimeCost[];
  goals: FinancialGoal[];
}
```

---

## 6. Autenticação e Segurança

O FinPlan foi projetado primordialmente para uso pessoal single-tenant. O fluxo de segurança é composto por:

1. **Autenticação por API Key Estática**:
   - Se a variável de ambiente `API_SECRET_KEY` for configurada no servidor (Vercel), a função serverless em [`api/budget.ts`](file:///home/gildo-duarte/Documentos/Projects/fin-plan/api/budget.ts) bloqueia qualquer requisição não autorizada.
   - O cliente HTTP no frontend envia o valor de `VITE_API_SECRET_KEY` no cabeçalho HTTP `x-api-key`.
   - Caso `API_SECRET_KEY` não seja preenchida no servidor, o endpoint opera em modo aberto (conveniente para desenvolvimento local simplificado).
2. **CORS Restrito**:
   - A função serverless define cabeçalhos de controle de acesso (`Access-Control-Allow-Origin: *`, métodos `GET,OPTIONS,POST`).
3. **Ausência de Multi-Tenancy**:
   - **Nota Explícita**: O sistema **não** possui tabela de usuários, cadastro de senhas, autenticação JWT ou sessões OAuth. Todos os dados referem-se a uma única entidade orçamentária (`default_budget`).

---

## 7. Pontos de Extensão e Limitações Conhecidas

### Limitações Conhecidas Atuais:
1. **Concorrência Simples (Last-Write-Wins)**:
   - Se a aplicação for aberta em duas abas ou dispositivos ao mesmo tempo e ambas realizarem edições simultâneas, o último salvamento sobrescreverá o documento remoto por completo. Não há implementação de CRDT (Conflict-Free Replicated Data Types) ou locks otimistas por versão de linha.
2. **Modelo Single-Tenant / Sem Múltiplos Usuários**:
   - Não há isolamento de múltiplos orçamentos por usuário no mesmo banco de dados. Caso seja necessário isolar orçamentos distintos, requer instâncias de bancos separadas ou extensão da estrutura com `userId`.
3. **Limite Físico BSON de 16 MB**:
   - O armazenamento de todo o estado em um único documento no MongoDB é restrito a 16 MB. Para o escopo de planejamento de 1 a 5 anos (dezenas de itens e meses), o arquivo ocupa ~20-50 KB, o que representa menos de 0,4% do limite.
4. **CI/CD Automatizado**:
   - O repositório não possui workflows do GitHub Actions configurados no momento; as validações de `npm test`, `npm run build` e `npm run test:e2e` devem ser executadas manualmente antes do merge.

### Pontos de Extensão Futuros:
- **Multi-Tenant**: Adição de claims de autenticação via Supabase Auth ou Auth0, particionando a coleção `budgets` por `userId`.
- **Importação Bancária Automática**: Integração via Open Finance / Pluggy para alimentar faturas de cartões e saldos em conta.
- **Histórico de Versões**: Coleção `budget_snapshots` gravando versões históricas a cada salvamento para fins de auditoria ou recuperação temporal.
