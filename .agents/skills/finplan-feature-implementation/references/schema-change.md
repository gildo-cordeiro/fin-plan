# Mudança de schema (PostgreSQL + Goose)

Referências: ADR-0002 (PostgreSQL relacional), ADR-0009 (UUIDv4) e ADR-0010 (Goose).

## Passos

1. Crie uma migração **nova**, sem editar as existentes. Use o próximo número
   sequencial em `apps/api/migrations/`:
   ```bash
   cd apps/api/migrations
   ls *.sql | tail -1          # ex.: 00004_drop_goal_icon.sql → próximo é 00005
   ```
   Arquivo `0000N_<descricao_snake_case>.sql`:
   ```sql
   -- +goose Up
   ALTER TABLE goal ADD COLUMN category TEXT;

   -- +goose Down
   ALTER TABLE goal DROP COLUMN category;
   ```
   Se `goose` estiver instalado, `goose create <nome> sql` também serve; renomeie
   para o padrão sequencial se ele gerar timestamp.
2. Os arquivos são embutidos via `//go:embed *.sql` em `migrations/schema.go` e
   aplicados no boot. Não é preciso registrar nada à mão.
3. Coluna nova em tabela com dados: defina `DEFAULT` ou aceite `NULL`, e trate
   `NULL` no scan do repository (`*string`, `pgtype`…).
4. Índice para toda coluna nova usada em `WHERE`/`JOIN`.
5. Rode `go test ./migrations/...` (`schema_test.go`) e `go test ./...`.

## Propagação

| Camada | Arquivo |
|---|---|
| Domínio Go | `internal/<feature>/<feature>.go` |
| DTO de entrada | `internal/<feature>/requests.go` |
| Queries | `internal/<feature>/repository.go` (`SELECT`, `INSERT`, `UPDATE`, `Scan`) |
| Contrato | `docs/API.md` |
| Diagrama ER | `docs/ARCHITECTURE.md` |
| Tipos TS | `apps/web/src/types/budget.ts` |

O `localStorage` guarda só preferências, então não há migração de dados no frontend.
