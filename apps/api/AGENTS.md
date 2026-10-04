# apps/api — Regras de Backend (Go + PostgreSQL)

Módulo `github.com/gildo-cordeiro/fin-plan/apps/api`. Entrypoint em
`cmd/api/main.go`, wiring e rotas em `internal/app/app.go`.

## Organização por feature

Cada entidade é um pacote em `internal/<feature>/` (`budget`, `item`, `entry`,
`cost`, `costitem`, `goal`, `reserve`), com os arquivos:

| Arquivo | Responsabilidade |
|---|---|
| `<feature>.go` | Modelo de domínio rico: struct, invariantes, métodos de regra |
| `requests.go` | DTOs de entrada e validação de payload (PATCH com ponteiros) |
| `view_models.go` / `summary.go` | DTOs de saída e agregados (quando existem) |
| `handler.go` | Só HTTP: parse, status, `httputil.WriteJSON` / `WriteError` |
| `service.go` | Orquestração da regra de negócio; depende de interfaces de repository |
| `repository.go` | **Único** arquivo que importa `pgx`; interface + `Postgres…Repository` |

- Injeção de dependência manual em `internal/app/app.go`, sem `wire`/`fx`.
- Interface só na fronteira do repository.
- Utilitários compartilhados ficam em `internal/httputil` (`GenerateUUID`,
  `IsValidUUID`, `IsValidDate`, respostas).

## Banco de dados

- `pgxpool` singleton criado em `app.New`, com `QueryExecModeExec` por
  compatibilidade com PgBouncer em transaction mode (ADR-0010). Nunca abrir
  conexão por request.
- Toda query recebe o `ctx` da requisição; não use `context.Background()` em handler/service.
- Sempre query parametrizada (`$1`, `$2`), nunca concatenação.
- Escritas relacionadas na mesma transação (`pgx.Tx`), por exemplo item e suas 12 entries.
- Agregados (somas, saldo acumulado) são calculados no SQL, não em Go (ADR-0007).
- Migrações: novo arquivo SQL versionado em `migrations/` (Goose, embutido via
  `//go:embed`). Nunca editar migração já aplicada (ADR-0010).

## Contrato de API

- Erro sempre como `{ "error": "mensagem" }` via `httputil.WriteError`, sem
  vazar SQL, stack ou connection string.
- `400` para validação, `404` para inexistente, `503` quando o banco não está
  disponível, `500` só para falha inesperada.
- PATCH parcial estrito: campo ausente ≠ campo zerado, com ponteiros (ADR-0008).
- IDs são UUIDv4 gerados no servidor (`httputil.GenerateUUID`, ADR-0009).
- `reserve` é livro-razão imutável, sem PATCH/DELETE (ADR-0006).
- Auth opcional por `API_SECRET_KEY` (`internal/middleware/auth.go`); não removê-la.
- Endpoint novo ou alterado → atualizar `docs/openapi.yaml`.

## Erros e testes

- `fmt.Errorf("contexto: %w", err)` ao propagar erros; nunca ignorar erro de I/O.
- Teste de service em `service_test.go` com repository fake, cobrindo também o
  caminho de erro.
- Validação: `go vet ./... && go test ./... && go build ./cmd/api`.
