# ADR-0009: Estratégia de Identificadores: UUIDv4 vs Chave Natural

- **Status**: Aceito
- **Data**: 2026-09-26
- **Decisores**: Equipe FinPlan

---

## 1. Contexto

A modelagem de dados do FinPlan requer identificadores unívocos para entidades geradas tanto no servidor quanto de forma otimista no cliente.

Historicamente, aplicações financeiras oscilam entre:
1. **IDs Sequenciais Inteiros (`SERIAL` / `BIGINT`)**: Simples e compactos, mas vazam volumetria para o cliente (ataque de enumeração) e não podem ser gerados previamente no frontend durante atualizações otimistas antes do roundtrip ao servidor.
2. **Slugs Determinísticos baseados no Nome** (ex: `salario-2026`): Frágeis, pois quando o usuário renomeia a categoria ou item, a chave primária precisaria sofrer mutação ou quebrar integridade referencial.
3. **Chaves Naturais de Negócio**: Eficientes quando o domínio possui um identificador intrínseco, perene e imutável.

---

## 2. Decisão

Decidiu-se adotar uma estratégia híbrida bem delimitada entre **Chave Natural** e **UUIDv4**:

1. **Chave Natural para a Raiz de Orçamento (`budget`)**:
   - `budget.id`: Armazenado como `TEXT` correspondente ao ano orçamentário (ex: `'2026'`).
   - `budget.year`: `INT NOT NULL UNIQUE` (ex: `2026`).
   - **Justificativa**: O orçamento no FinPlan é estritamente anual. Não existem múltiplos orçamentos para um mesmo ano civil. O uso do ano como chave natural torna as rotas REST semânticas e elegantes (`GET /api/v1/budgets/2026`, `GET /api/v1/budgets/2026/summary`), dispensando UUIDs arbitrários para o elemento raiz.
2. **UUIDv4 Aleatório para Todas as Entidades Granulares**:
   - Aplicado a: `item`, `entry`, `cost`, `cost_item`, `goal`, `goal_contribution`, `reserve_movement`.
   - **No PostgreSQL**: Utiliza a extensão `pgcrypto` com valor default `gen_random_uuid()`.
   - **No Frontend**: Utiliza a Web API nativa `crypto.randomUUID()` através do helper `apps/web/src/utils/idGenerator.ts`.
   - **Proibição de Slugs**: É terminantemente proibido utilizar slugs determinísticos derivados do nome para chaves primárias ou identificadores relacionais.

---

## 3. Consequências

### 3.1. Positivas
- **Suporte Perfeito a Optimistic UI**: O frontend pode gerar o identificador UUIDv4 de um novo item ou aporte antes mesmo de enviar a requisição à API, associando filhos ou exibindo o elemento na tela sem esperar o ID do banco.
- **Imutabilidade e Segurança**: Alterações de nomes não impactam chaves de banco ou relacionamentos de chave estrangeira. IDs aleatórios impedem enumeração por varredura sequencial.
- **Legibilidade em Rotas Raiz**: URLs como `/api/v1/budgets/2026/summary` são limpas, autoexplicativas e fáceis de debugar.

### 3.2. Negativas e Trade-offs
- **Consumo de Armazenamento**: UUIDs ocupam 16 bytes no disco (ou 36 caracteres em representação textual com hífens), sendo ligeiramente maiores que inteiros `BIGINT`. Para o volume de um planejador financeiro pessoal, esse impacto é insignificante.

---

## 4. Referências

- [`apps/api/migrations/000001_initial_schema.up.sql`](../../apps/api/migrations/000001_initial_schema.up.sql#L4-L16)
- [`apps/web/src/utils/idGenerator.ts`](../../apps/web/src/utils/idGenerator.ts)
- [`.agents/skills/finplan-feature-implementation/SKILL.md`](../../.agents/skills/finplan-feature-implementation/SKILL.md#L47)
- [`docs/API.md`](../API.md#2-orçamento-budget)
