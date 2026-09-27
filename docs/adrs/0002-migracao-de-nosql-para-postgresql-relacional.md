# ADR-0002: Migração de Persistência NoSQL (MongoDB Documento Único) para Relacional (PostgreSQL)

- **Status**: Aceito
- **Data**: 2026-09-20
- **Decisores**: Equipe FinPlan

---

## 1. Contexto

Na concepção inicial do FinPlan, a persistência remota era realizada em um cluster MongoDB Atlas armazenando o estado do orçamento como um documento NoSQL único (`_id: 'default_budget'`).

Com a maturação das funcionalidades do sistema, essa abordagem apresentou limitações estruturais severas:
1. **Concorrência e Perda de Dados (Last-Write-Wins)**: Qualquer alteração mínima (ex: editar uma célula de valor planejado) exigia o envio e a sobrescrita do documento inteiro, gerando risco iminente de perda de dados caso múltiplos clientes salvassem simultaneamente.
2. **Ausência de Integridade Referencial**: Relações entre metas, contribuições, despesas e lançamentos precisavam ser validadas inteiramente pela aplicação. Deleções em cascata manuais abriam brechas para registros órfãos.
3. **Inconsistências de Arredondamento Monetário**: O armazenamento em tipos nativos do BSON/JSON (IEEE 754 de ponto flutuante duplo) gerava discrepâncias de centavos em somatórios anuais e saldos acumulados.
4. **Incapacidade de Consultas e Agregações Eficientes**: Relatórios mensais e cálculos contábeis exigiam puxar a árvore completa de dados para a memória ou criar pipelines de agregação excessivamente complexos.

---

## 2. Decisão

Decidiu-se descontinuar o uso do MongoDB e migrar toda a persistência do FinPlan para um banco de dados relacional **PostgreSQL**, estruturado em um schema normalizado com:

1. **Schema Relacional Normalizado**:
   - `budget`: Orçamento anual com chave natural `year` (ex: `2026`).
   - `item`: Itens recorrentes com tipagem restrita (`CHECK (type IN ('renda','fixa','variavel','cartao'))`).
   - `entry`: 12 lançamentos mensais por item com restrição de unicidade `UNIQUE (item_id, month)`.
   - `cost` e `cost_item`: Projetos de despesas pontuais e seus itens filhos.
   - `goal` e `goal_contribution`: Metas financeiras e histórico de aportes.
   - `reserve_movement`: Livro-razão da reserva de emergência.
2. **Precisão Numérica Decimal**:
   - Todos os campos monetários utilizam o tipo `NUMERIC(12,2)`, garantindo precisão contábil exata e eliminando erros de ponto flutuante.
3. **Integridade Referencial com Cascata**:
   - Todas as chaves estrangeiras definem `ON DELETE CASCADE`, garantindo que a exclusão de um orçamento, item ou projeto limpe automaticamente suas dependências.
4. **Gerenciamento de Schema por Migrações SQL**:
   - Uso de arquivos SQL puros versionados (`migrations/000001_initial_schema.up.sql`) gerenciados pelo driver nativo/ferramenta de migração em Go (`pgxpool`).

---

## 3. Consequências

### 3.1. Positivas
- **Operações Atômicas e Granulares**: O cliente agora atualiza apenas a entidade alterada via chamadas HTTP pontuais (`PATCH /api/v1/entries/{id}`, `POST /api/v1/costs`, etc.), sem trafegar o estado completo da aplicação.
- **Confiabilidade Contábil**: Tipos `NUMERIC(12,2)` e integridade de chaves estrangeiras eliminam inconsistências financeiras e registros órfãos.
- **Poder Analítico do SQL**: Possibilidade de executar agregações e window functions diretamente no PostgreSQL (`SUM(...) OVER (ORDER BY month)`).
- **Desempenho e Eficiência de Rede**: Payloads de request e response caíram de dezenas de kilobytes para poucos bytes por mutação.

### 3.2. Negativas e Trade-offs
- **Complexidade de Schema**: A introdução de tabelas relacionais exige controle estrito de migrações (`golang-migrate` / SQL versionado) em vez de schema flexível NoSQL.
- **Infraestrutura**: Requer provisionamento e manutenção de uma instância PostgreSQL gerenciada (Docker em desenvolvimento; Supabase, Neon ou RDS em produção).

---

## 4. Referências

- [`apps/api/migrations/000001_initial_schema.up.sql`](../../apps/api/migrations/000001_initial_schema.up.sql)
- [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md)
- [`docs/API.md`](../API.md)
