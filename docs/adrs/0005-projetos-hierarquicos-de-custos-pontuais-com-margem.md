# ADR-0005: Projetos Hierárquicos de Custos Pontuais com Margem de Imprevistos (`cost` e `cost_item`)

- **Status**: Aceito
- **Data**: 2026-09-23
- **Decisores**: Equipe FinPlan

---

## 1. Contexto

No desenho inicial de custos pontuais (despesas não recorrentes, como viagens, reformas ou mudanças), a modelagem previa uma tabela flat (`cost`), onde cada registro representava uma despesa única e direta com um mês e um valor.

Entretanto, na realidade do planejamento orçamentário pessoal:
1. **Eventos Complexos**: Gastos pontuais expressivos raramente são despesas isoladas. Uma "Reforma", por exemplo, engloba itens diversos (mão de obra, revestimento, materiais hidráulicos, pintura), frequentemente pagos a fornecedores distintos e em meses diferentes.
2. **Margem de Imprevistos por Projeto**: Projetos não recorrentes possuem naturezas de risco distintas (uma reforma pode exigir 15% de margem de contingência, enquanto a compra de um computador exige 0%). A margem não podia ser um parâmetro global estático.
3. **Distribuição Temporal Flexível**: Alguns subitens de um projeto ocorrem em um mês específico, enquanto outros desembolsos podem ainda não ter data definida.

---

## 2. Decisão

Decidiu-se estruturar os custos pontuais em uma relação hierárquica **Projeto (`cost`) → Itens (`cost_item`)**:

1. **Entidade Pai (`cost`)**:
   - Representa o projeto ou evento orçamentário.
   - Campos: `id`, `budget_id`, `name`, `default_month` (mês padrão, opcional/nullable), `margin_percent` (percentual de imprevistos do projeto, ex: `10.00`) e `notes`.
2. **Entidade Filha (`cost_item`)**:
   - Representa o desembolso individual.
   - Campos: `id`, `cost_id`, `name`, `planned_amount`, `actual_amount`, `month` (mês específico, opcional/nullable), `due_date`, `paid_date`.
3. **Regra de Herança de Mês**:
   - Se `cost_item.month` estiver preenchido, prevalece o mês do item.
   - Se for `NULL`, o item herda `cost.default_month`.
   - Se ambos forem `NULL`, o item é classificado como "sem mês fixo", sendo contabilizado apenas na dedução do saldo final anual em `totals.oneTimeCosts`.
4. **Cálculo de Margem Centralizado no Backend**:
   - O cálculo do somatório orçado e do valor com margem é executado exclusivamente no PostgreSQL via consulta SQL com agregação `SUM`:
     - `totalPlanned = SUM(cost_item.planned_amount)`
     - `totalWithMargin = totalPlanned * (1 + margin_percent / 100)`
   - O frontend consome esses valores prontos via `GET /api/v1/costs/{id}` e **nunca** duplica a fórmula de margem, evitando divergências de arredondamento.

---

## 3. Consequências

### 3.1. Positivas
- **Aderência ao Mundo Real**: Permite orçar reformas, viagens ou compras planejadas com múltiplos itens parcelados em meses diferentes sob o mesmo guarda-chuva.
- **Precisão de Contingência**: A margem de imprevistos reflete o risco específico de cada projeto individual.
- **Fonte Única da Verdade**: Totais calculados por agregação SQL eliminam inconsistências entre a visão detalhada do projeto e os cards consolidados da dashboard.

### 3.2. Negativas e Trade-offs
- **Hierarquia de Rotas REST**: Exige endpoints aninhados para gerenciamento dos itens (`POST /api/v1/costs/{costId}/items`, `PATCH /api/v1/costs/{costId}/items/{id}`, `DELETE ...`).

---

## 4. Referências

- [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md#34-projetos-de-custo-pontual-hierárquicos-cost-e-cost_item)
- [`apps/api/migrations/000001_initial_schema.up.sql`](../../apps/api/migrations/000001_initial_schema.up.sql#L38-L58)
- [`apps/api/internal/cost/repository.go`](../../apps/api/internal/cost/repository.go)
- [`docs/API.md`](../API.md#4-projetos-de-custo-pontual-cost-e-cost_item)
