-- Ano de orçamento (id = ano, chave natural)
CREATE TABLE budget (
  id                        TEXT PRIMARY KEY,        -- ex: '2026'
  year                      INT NOT NULL UNIQUE,
  initial_balance           NUMERIC(12,2) NOT NULL DEFAULT 0,
  emergency_reserve_target  NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- "months" não vira tabela: nome/mês/shortName são deriváveis de (ano, monthIndex).

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
  paid_date       DATE,                               -- preenchido = "confirmado" (sem coluna de status)
  UNIQUE (item_id, month)
);

-- Projeto/evento de custo pontual (ex: "Mudança")
CREATE TABLE cost (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id        TEXT NOT NULL REFERENCES budget(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  default_month    INT CHECK (default_month BETWEEN 1 AND 12),  -- NULL = "sem mês fixo, deduz no saldo final"
  margin_percent   NUMERIC(5,2) NOT NULL DEFAULT 0,               -- "Margem de Imprevistos"
  notes            TEXT
);

-- Item individual dentro do projeto de custo pontual
CREATE TABLE cost_item (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_id          UUID NOT NULL REFERENCES cost(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  planned_amount   NUMERIC(12,2) NOT NULL,
  actual_amount    NUMERIC(12,2),
  month            INT CHECK (month BETWEEN 1 AND 12),  -- NULL = herda cost.default_month; ambos NULL = deduz no saldo final do ano
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

-- Movimentação da reserva de emergência
CREATE TABLE reserve_movement (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id  TEXT NOT NULL REFERENCES budget(id) ON DELETE CASCADE,
  month      INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount     NUMERIC(12,2) NOT NULL,   -- positivo = aporte, negativo = retirada
  reason     TEXT
);

# TAREFA: Revisar o frontend do FinPlan para consumir o backend PostgreSQL

O backend (`apps/api`) foi migrado de MongoDB para PostgreSQL, com modelo
relacional novo (`budget`, `item`, `entry`, `cost`, `cost_item`, `goal`,
`goal_contribution`, `reserve_movement`). Esta tarefa adapta o frontend
(`src/`) para consumir o novo contrato de API, preservando o comportamento
visual atual — as 4 telas (Mês Atual, 12 Meses & Gráficos, Metas & Reserva,
Simulações) continuam existindo com a mesma disposição, só a fonte de dados
e algumas interações mudam.

Leia `docs/API.md` e `docs/ARCHITECTURE.md` atualizados (gerados na migração
do backend) antes de tocar em qualquer arquivo.

## Mudança conceitual central: planejado vs. realizado

Hoje, cada linha de item (ex: "Salário I: 4.000,00") é um número editável
direto. No modelo novo, esse número é `entry.planned_amount`, com
`entry.actual_amount`/`paid_date` como um estado separado (preenchido só
quando o usuário confirma que o dinheiro realmente entrou/saiu). Todas as
telas que hoje só editam um valor precisam de uma ação adicional
("confirmar" / "marcar como realizado"), distinta de "editar planejado".

## Tela: Mês Atual (`src/components/budget/`)

- Cada linha de item (Rendas, Cartões, Fixas, Variáveis) continua editável
  como hoje (isso edita `entry.planned_amount` via
  `PATCH /api/v1/entries/{id}`), mas ganha um controle novo (ex: checkbox ou
  botão "confirmar") que preenche `actual_amount`/`paid_date` — sem isso,
  não existe forma de o usuário registrar "isso já aconteceu".
- "+ Novo Item" continua criando um `item` (`POST /api/v1/items`) — o
  backend já gera as 12 `entry` automaticamente, o frontend não precisa mais
  gerenciar isso.
- "Saldo em conta hoje" e "Sobra média mensal" (topo da tela) passam a vir
  de `GET /budgets/{year}/summary`, não mais calculados no frontend.
- "Saldo acumulado em conta até [mês]" (dentro da aba Mês Atual) também vem
  do summary do backend.

## Tela: 12 Meses & Gráficos (`src/components/dashboard/`)

- A tabela "Resumo mês a mês" (Renda/Cartões/Fixas/Variáveis/Sobra do
  mês/Saldo acumulado) e o gráfico "Trajetória do Saldo Acumulado" hoje são
  calculados em `budgetCalculator.ts` a partir do blob completo. Passam a
  consumir diretamente `GET /budgets/{year}/summary`, que já retorna esses
  valores agregados por mês via SQL — remover a lógica de soma/acumulação
  correspondente do `budgetCalculator.ts` (o backend agora é a fonte dessa
  verdade, não o frontend).
- "Baixar planilha (CSV)" continua no frontend, mas exportando os dados já
  vindos do summary, não recalculados.

## Tela: Metas & Reserva (`src/components/goals/`)

Esta tela precisa da revisão mais profunda porque o modelo de custo pontual
mudou de "1 custo = 1 valor" para "1 projeto (`cost`) com N itens
(`cost_item`)":

- "Metas & Eventos Financeiros" → seção de `goal`: continua criando/editando
  `goal` e `goal_contribution` via `POST /goals`,
  `POST /goals/{id}/contributions`.
- "Custos Pontuais e Projetos Especiais" → "+ Adicionar Custo" cria um
  `cost` (`POST /api/v1/costs`), com nome e `default_month` — o dropdown
  "Agendamento Global do Evento" (com a opção "Sem mês fixo (deduzir no
  saldo final)") mapeia direto para `cost.default_month` nullable.
- A tabela de itens dentro do custo (mencionada em "você também pode
  definir o mês de pagamento individualmente em cada item da tabela
  abaixo") passa a ser CRUD de `cost_item`
  (`POST/PATCH/DELETE /api/v1/costs/{costId}/items`), cada um podendo
  sobrescrever o mês herdado do `cost` pai.
- "Custo Total dos Itens" e "Com Margem de Imprevistos (+X%)" são somas de
  `cost_item.planned_amount` do `cost` — calcular no backend (endpoint de
  detalhe do `cost`) em vez de no frontend, já que agora envolve join entre
  `cost` e `cost_item`.
- "Status de Poupança" (hoje "Crie uma meta acima para acompanhar")
  continua dependendo de `goal`, sem mudança de fonte de dado.

## Tela: Simulações (`src/components/simulation/`)

Não muda de arquitetura — os sliders ("Variação dos Gastos Variáveis",
"Margem de Imprevistos em Custos Pontuais") continuam sendo cálculo
client-side em cima dos dados já carregados, sem persistir nada no backend.
Só ajustar a fonte: os valores-base ("Despesas Variáveis (Média/mês)",
"Custos Pontuais Totais") agora vêm da agregação de `entry`/`cost_item`
carregados via `GET /budgets/{year}`, em vez do blob antigo.

## Arquivos a revisar

1. `src/types/budget.ts` — tipos novos: `Item`, `Entry`
   (plannedAmount/actualAmount/dueDate/paidDate), `Cost`, `CostItem`,
   `Goal`, `GoalContribution`, `ReserveMovement`, `BudgetSummary` (payload
   de `GET /budgets/{year}/summary`).
2. `src/services/budgetApiService.ts` — trocar as chamadas de
   `GET/POST /api/budget` (blob único) pelos novos endpoints atômicos
   listados em `docs/API.md`.
3. `src/context/BudgetContext.tsx` — reavaliar o debounce de 500ms: com
   endpoints atômicos por recurso, decidir explicitamente se cada edição
   discreta (blur de input, clique em "confirmar") dispara direto ou se
   ainda faz sentido agrupar (ex: enquanto o usuário digita um valor antes
   de sair do campo). Não herdar o padrão antigo sem essa decisão.
4. `src/services/budgetCalculator.ts` — remover cálculos que agora vêm do
   backend (saldo mensal, saldo acumulado, projeção de reserva); manter só
   o que é puramente client-side (as simulações "E se...").
5. `src/services/storageService.ts` — nova versão de schema local
   (`finplan-app-data-v5`), migração automática do formato antigo, seguindo
   o padrão já usado em v3→v4.
6. `src/components/budget/` — ação de "confirmar" pagamento/recebimento por
   entry.
7. `src/components/goals/` — CRUD de `cost_item` aninhado em `cost`.

## Validação obrigatória
- Cada uma das 4 telas deve continuar visualmente idêntica ao estado atual
  (mesmos cards, mesmos textos, mesma disposição) — só a fonte de dados e as
  interações de "confirmar" mudam.
- Testar o fluxo completo manualmente: criar item → ver 12 entries geradas →
  confirmar uma entry → ver refletido no summary/gráfico → criar custo
  pontual com "sem mês fixo" → criar 2 itens dentro, um com mês próprio → ver
  refletido no total e no saldo do mês correto.
- Atualizar `docs/API.md` e `docs/ARCHITECTURE.md` se algum detalhe de
  contrato mudar durante a implementação.