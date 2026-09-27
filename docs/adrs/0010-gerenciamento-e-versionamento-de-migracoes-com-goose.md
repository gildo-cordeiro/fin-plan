# ADR-0010: Gerenciamento e Versionamento de Migrações de Banco de Dados com Goose

- **Status**: Aceito
- **Data**: 2026-09-27
- **Decisores**: Equipe FinPlan

---

## 1. Contexto

Com a migração da persistência do FinPlan para o PostgreSQL relacional ([ADR-0002](0002-migracao-de-nosql-para-postgresql-relacional.md)), a estrutura de tabelas, índices e restrições precisa evoluir continuamente para atender a novos requisitos de negócio (por exemplo, a adição de conciliação de saldo bancário com os campos `reconciled_month` e `reconciled_balance` na entidade `budget`).

Anteriormente, o schema residia em scripts SQL estáticos sem uma esteira formal de versionamento incremental. Essa abordagem gerava problemas críticos:
1. **Risco de Alteração Retroativa de Migrações**: Modificar scripts de migrações passadas que já haviam sido aplicados em ambientes locais ou de produção quebrava a reprodutibilidade dos bancos e a rastreabilidade das alterações.
2. **Drift entre Ambientes**: Sem uma tabela de controle de versão executada automaticamente, bancos em desenvolvimento, CI e produção ficavam com schemas divergentes.
3. **Falta de Padronização no Ecossistema Go**: Havia o risco de criar migrações ad-hoc ou "reinventar a roda" com scripts manuais sem tratamento de locks concorrentes, atomicidade transacional e rollback (`Down`).

Fazia-se necessário definir um padrão corporativo estrito de evolução de schema em Go, utilizando uma ferramenta consolidada da comunidade, que operasse embutida no binário e sem dependência de runtimes pesados adicionais (como JVM para Flyway).

---

## 2. Decisão

Decidiu-se adotar formalmente a biblioteca **Goose** (`github.com/pressly/goose/v3`) como o padrão oficial de gerenciamento e versionamento de banco de dados do FinPlan, alinhada às seguintes diretrizes:

### 2.1. Princípio da Imutabilidade das Migrações
- **Regra Fundamental**: **Nunca alterar uma migração existente**. Uma vez versionada e aplicada, uma migração é imutável.
- Qualquer alteração estrutural, correção de tipo, novo índice ou nova coluna deve ser realizada criando-se **um novo arquivo de migração sequencial** (ex: `00001_initial_schema.sql`, `00002_add_reconciled_budget.sql`, etc.).

### 2.2. Formato Unificado de Arquivo SQL
- Utiliza-se a convenção nativa do Goose de arquivos `.sql` únicos contendo tanto as instruções de avanço quanto de reversão através de anotações:
  ```sql
  -- +goose Up
  ALTER TABLE budget ADD COLUMN IF NOT EXISTS reconciled_month INT CHECK (reconciled_month BETWEEN 1 AND 12);
  ALTER TABLE budget ADD COLUMN IF NOT EXISTS reconciled_balance NUMERIC(12,2);

  -- +goose Down
  ALTER TABLE budget DROP COLUMN IF EXISTS reconciled_month;
  ALTER TABLE budget DROP COLUMN IF EXISTS reconciled_balance;
  ```
- Nomenclatura dos arquivos: `{versao_5_digitos}_{nome_descritivo}.sql`.

### 2.3. Execução Embutida no Binário Go (`embed.FS` + `pgx/stdlib`) e Compatibilidade com PgBouncer
- Todas as migrações SQL residem em `apps/api/migrations` e são compiladas diretamente no binário Go utilizando `//go:embed *.sql`.
- Durante a inicialização da API Go (`apps/api/internal/app/app.go`), a função `migrations.RunMigrations(ctx, pool)`:
  1. Clona a configuração de conexão do pool (`pool.Config().ConnConfig.Copy()`).
  2. Define explicitamente `DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol`. Esta configuração é **mandatória** para compatibilidade com connection poolers em transaction mode (ex: PgBouncer do Supabase na porta 6543, Neon, etc.), evitando colisões de prepared statements (`FATAL: prepared statement name is already in use (SQLSTATE 08P01)`).
  3. Cria um `*sql.DB` dedicado com `stdlib.OpenDB(*connConfig)` e restringe a concorrência a 1 conexão (`db.SetMaxOpenConns(1)`).
  4. Define o sistema de arquivos virtual via `goose.SetBaseFS(EmbedMigrations)`.
  5. Configura o dialeto `postgres` e executa `goose.UpContext(ctx, db, ".")`.
- No pool principal da aplicação (`pgxpool`), configura-se `QueryExecModeExec` por padrão se não sobrescrito pelo cliente, preservando eficiência e evitando retenção de prepared statements no PgBouncer.
- O Goose cria e mantém automaticamente a tabela de controle `goose_db_version` no banco, garantindo aplicação idempotente e ordenada das migrações pendentes antes que o servidor HTTP comece a receber tráfego.

### 2.4. Validação Automatizada em Testes Unitários
- O arquivo `apps/api/migrations/schema_test.go` valida programaticamente através de `goose.CollectMigrations` que os arquivos embutidos estão íntegros, válidos e na ordem correta, garantindo que quebras de sintaxe ou versões faltantes sejam capturadas durante a execução de `go test ./...` em CI/CD sem necessidade de banco de dados ativo.

---

## 3. Alternativas Consideradas e Rejeitadas

| Alternativa | Veredito | Justificativa |
|---|---|---|
| **Flyway / Liquibase** | Rejeitado | Exigem runtime Java (JVM) e ferramentas CLI externas em containers, adicionando peso desnecessário à imagem Docker de produção e quebrando o princípio de ecossistema Go puro e enxuto. |
| **Migrador Customizado In-House** | Rejeitado | Propenso a falhas de concorrência, ausência de tabela de locks confiável e complexidade desnecessária de manutenção interna. |
| **golang-migrate CLI / Library** | Rejeitado em favor do Goose | Embora popular em Go, o `golang-migrate` fragmenta cada migração em dois arquivos separados (`.up.sql` e `.down.sql`), enquanto o Goose suporta um único arquivo por versão com anotações claras, melhor ergonomia com `embed.FS` e excelente integração com drivers pgx v5. |

---

## 4. Consequências

### 4.1. Positivas
- **Zero Dependências Externas em Produção**: As migrações trafegam compactadas dentro do executável Go, eliminando dependências de arquivos montados em volumes de container.
- **Deploys Seguros e Idempotentes**: Cada inicialização da aplicação garante que o banco está alinhado com a versão do binário antes de processar qualquer requisição HTTP.
- **Rastreabilidade Histórica Estrita**: O histórico de evolução do schema permanece auditável no Git e refletido na tabela `goose_db_version`.
- **Prevenção de Regressões**: A proibição de editar migrações antigas protege contra divergências de schema entre estações de desenvolvimento e produção.

### 4.2. Negativas e Trade-offs
- **Disciplina Estrita de Versionamento**: Qualquer mudança mínima requer gerar um novo arquivo de migração.
- **Atenção em Branches Paralelas**: Caso desenvolvedores criem migrações com o mesmo prefixo numérico em branches distintas, o conflito deve ser resolvido reordenando o número da versão antes do merge.

---

## 5. Referências

- [Repositório Oficial do Goose](https://github.com/pressly/goose)
- [ADR-0002: Migração NoSQL para PostgreSQL Relacional](0002-migracao-de-nosql-para-postgresql-relacional.md)
- [`apps/api/migrations/schema.go`](../../apps/api/migrations/schema.go)
- [`apps/api/migrations/schema_test.go`](../../apps/api/migrations/schema_test.go)
- [`apps/api/migrations/00001_initial_schema.sql`](../../apps/api/migrations/00001_initial_schema.sql)
- [`apps/api/migrations/00002_add_reconciled_budget.sql`](../../apps/api/migrations/00002_add_reconciled_budget.sql)
- [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md)
