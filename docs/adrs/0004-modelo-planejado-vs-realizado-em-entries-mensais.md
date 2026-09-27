# ADR-0004: Modelo Mensal Explícito Planejado vs. Realizado (`item` e `entry`)

- **Status**: Aceito
- **Data**: 2026-09-22
- **Decisores**: Equipe FinPlan

---

## 1. Contexto

No modelo de dados inicial, os valores monetários de um item orçamentário eram modelados como um mapa dinâmico de strings para valores no formato `item.values["YYYY-MM"] = valor`.

Essa abordagem apresentava duas deficiências conceituais importantes para o planejamento financeiro:
1. **Ausência de Distinção entre Planejado e Realizado**: Era impossível saber se o valor indicado representava a estimativa orçada no planejamento inicial ou o valor real efetivamente debitado na conta corrente ou cartão.
2. **Falta de Histórico de Liquidação**: Não havia como registrar a data exata em que o pagamento foi realizado (`paid_date`) nem comparar desvios entre meta orçada e realização real.
3. **Modelagem Não-Relacional Flexível Demais**: O mapa dinâmico dificultava consultas de agregação SQL para totais mensais e permitia chaves de meses inconsistentes.

---

## 2. Decisão

Decidiu-se separar o conceito de item recorrente de seus lançamentos mensais, introduzindo as entidades relacionais **`item`** e **`entry`**:

1. **Separação de Responsabilidades**:
   - `item`: Representa a categoria ou obrigação perene (ex: "Salário", "Aluguel", "Plano de Saúde"), associada ao ano orçamentário (`budget_id`) e com tipo restrito (`renda`, `fixa`, `variavel`, `cartao`).
   - `entry`: Representa o lançamento específico para um determinado mês (1 a 12), vinculado exclusivamente a um `item_id`.
2. **Geração Automática das 12 Entradas**:
   - Ao criar um item via `POST /api/v1/items`, o backend gera atomicamente em lote as **12 entradas mensais** (meses 1 a 12) com `planned_amount = 0.00` e `actual_amount = NULL`.
   - Uma restrição de unicidade composta (`UNIQUE (item_id, month)`) impede entradas duplicadas no mesmo mês.
3. **Semântica de Realização sem Coluna Artificial de Status**:
   - `planned_amount NUMERIC(12,2) NOT NULL DEFAULT 0`: Valor orçado/previsto.
   - `actual_amount NUMERIC(12,2)`: Valor efetivamente pago/recebido (`NULL` significa pendente/não realizado).
   - `due_date DATE`: Data de vencimento opcional.
   - `paid_date DATE`: Data de liquidação do lançamento.
   - **Regra de Negócio**: Um lançamento é considerado formalmente **confirmado/liquidado** pela presença simultânea de `actual_amount` e `paid_date`. Isso elimina a necessidade de uma coluna redundante `status` (ex: `'pendente'` vs `'pago'`), evitando inconsistências onde um item estaria "pago" mas sem data registrada.

---

## 3. Consequências

### 3.1. Positivas
- **Acompanhamento Financeiro Fiel**: O usuário pode planejar todo o seu ano previamente com `planned_amount` e, mês a mês, confirmar os valores reais liquidando com `actual_amount` e `paid_date`.
- **Integridade Contábil**: As 12 entradas anuais são garantidas no banco, simplificando consultas de matriz 12 meses sem necessidade de *outer joins* vazios complexos no frontend.
- **Transparência de Desvios**: Facilita relatórios comparativos imediatos de variação orçamentária (`actual_amount - planned_amount`).

### 3.2. Negativas e Trade-offs
- **Volume de Inserção Inicial**: A criação de cada novo item requer a inserção de 13 registros (1 `item` + 12 `entry`). Isso é mitigado executando um *batch insert* de alta performance via `pgx` na mesma transação.

---

## 4. Referências

- [`apps/api/migrations/000001_initial_schema.up.sql`](../../apps/api/migrations/000001_initial_schema.up.sql#L47-L56)
- [`apps/api/internal/item/repository.go`](../../apps/api/internal/item/repository.go)
- [`apps/web/src/types/budget.ts`](../../apps/web/src/types/budget.ts#L43-L54)
- [`docs/API.md`](../API.md#3-itens-e-lançamentos-item-e-entry)
