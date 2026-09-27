# ADR-0007: Consolidação Contábil Server-Side com Window Functions SQL (`/summary`)

- **Status**: Aceito
- **Data**: 2026-09-25
- **Decisores**: Equipe FinPlan

---

## 1. Contexto

No design original do FinPlan, todos os cálculos analíticos — incluindo totais de despesas por categoria, saldo líquido mensal e o saldo financeiro acumulado ao longo dos 12 meses — eram computados no navegador pelo arquivo TypeScript `budgetCalculator.ts`.

Essa prática gerava problemas sérios:
1. **Divergências de Ponto Flutuante**: O JavaScript opera internamente com números de ponto flutuante de precisão dupla (padrão IEEE 754), o que provocava anomalias clássicas de arredondamento monetário (como `0.1 + 0.2 = 0.30000000000000004`), acumulando distorções de centavos ao longo do horizonte anual.
2. **Duplicação de Regras de Negócio**: Qualquer necessidade de expor relatórios, alertas ou resumos no backend exigiria reimplementar as mesmas fórmulas em Go, criando risco perpétuo de descompasso.
3. **Carga no Cliente**: O navegador precisava iterar matrizes de itens e entradas sempre que qualquer componente renderizava a visão anual consolidada.

---

## 2. Decisão

Decidiu-se que **o cálculo de consolidação contábil e apuração de saldos é de responsabilidade exclusiva do backend via PostgreSQL**, servido pelo endpoint dedicado `GET /api/v1/budgets/{year}/summary`:

1. **Uso de Window Functions no PostgreSQL**:
   - O saldo acumulado mês a mês é calculado no motor do banco utilizando window function sobre a série cronológica dos meses (1 a 12):
     ```sql
     SUM(month_balance) OVER (ORDER BY month) + initial_balance AS accumulated_balance
     ```
   - As agregações por tipo de item (`income`, `cards`, `fixed`, `variable`) utilizam `SUM(COALESCE(actual_amount, planned_amount))` com agrupamento mensal.
2. **Resolução de Custos Pontuais no Resumo**:
   - Custos pontuais com mês definido (`COALESCE(cost_item.month, cost.default_month)`) são alocados no respectivo mês em `oneTimeCosts`.
   - Custos sem mês definido em nenhum nível incidem exclusivamente em `totals.oneTimeCosts`, deduzindo no saldo acumulado final (`finalAccumulated`).
3. **Redefinição do Papel de `budgetCalculator.ts` no Frontend**:
   - O frontend consome diretamente o objeto `BudgetSummary` retornado pela API para alimentar tabelas consolidadas, cards de saldo e gráficos (`HorizonView`, `MonthlySummaryTable`, `CashFlowChart`).
   - O arquivo `budgetCalculator.ts` no frontend permanece restrito a **simulações locais de cenários hipotéticos** ("E se eu aumentar minha renda em 5% ou cortar 10% das despesas variáveis?"), aplicando percentuais temporários em memória sobre os números consolidados vindos do backend.

---

## 3. Consequências

### 3.1. Positivas
- **Precisão Contábil Absoluta**: A computação em tipo `NUMERIC(12,2)` no PostgreSQL assegura que cada centavo feche com exatidão matemática.
- **Performance de Renderização**: O frontend recebe os 12 meses prontos para consumo imediato em uma única consulta enxuta, sem loops pesados de iteração.
- **Consistência Centralizada**: Uma alteração na regra contábil é feita exclusivamente no repositório SQL em Go (`apps/api/internal/budget/repository.go`), refletindo automaticamente em todas as telas da aplicação.

### 3.2. Negativas e Trade-offs
- **Complexidade de Query SQL**: A consulta do summary é mais elaborada, envolvendo subqueries, `LEFT JOIN` e *Common Table Expressions (CTEs)* ou window functions, exigindo testes automatizados de integração dedicados no backend.

---

## 4. Referências

- [`apps/api/internal/budget/repository.go`](../../apps/api/internal/budget/repository.go#L115-L259)
- [`apps/api/internal/budget/model.go`](../../apps/api/internal/budget/model.go)
- [`docs/API.md`](../API.md#get-apiv1budgetsyearsummary)
- [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md#36-resumo-mensal-server-side-via-window-functions)
