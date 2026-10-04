# Checklist de revisão de backend (por prioridade)

## 1. Corretude de Go
- Erro ignorado (`_ = f()` ou sem checagem) em I/O (Postgres, rede, arquivo).
- `return err` sem contexto em vez de `fmt.Errorf("contexto: %w", err)`.
- Dereferência de ponteiro opcional (`*float64`, `*string`) sem checar `nil`,
  principalmente nos DTOs de PATCH em `requests.go`.
- `defer` dentro de loop (ex.: `rows.Close()` por iteração).
- `rows.Err()` não checado depois de iterar `pgx.Rows`.
- Shadowing de `err` com `:=` escondendo erro anterior.
- `pgx.ErrNoRows` não mapeado para "não encontrado" (vira `500` em vez de `404`).

## 2. Contexto, concorrência e recursos
- `context.Background()`/`TODO()` em handler, service ou repository em vez do `r.Context()` propagado.
- Pool criado fora de `app.New` ou conexão aberta por request.
- `go func(){}` sem forma de esperar ou cancelar.
- Estado mutável de pacote sem sincronização.
- Graceful shutdown que não fecha o `pgxpool` ou o `http.Server` (`cmd/api/main.go`, `internal/app/app.go`).

## 3. Camadas e domínio
- `pgx` importado fora de `repository.go` (ou de `migrations/`/`app/`).
- Regra de negócio no handler (validação de domínio, cálculo, decisão
  condicional que não é HTTP/JSON).
- Invariante de domínio espalhada pelo service quando deveria ser método do
  modelo em `<feature>.go`.
- DTO de entrada/saída misturado com a struct de domínio (usar `requests.go` /
  `view_models.go`).
- Interface criada sem necessidade (o padrão é interface só no repository).
- DI por framework em vez do wiring manual em `internal/app/app.go`.
- Entidade nova fora de `internal/<feature>/`.

## 4. SQL, transações e schema
- Concatenação de string com input em vez de `$1`, `$2`… (SQL injection).
- Múltiplas escritas relacionadas fora de `pgx.Tx` (ex.: item e suas 12 entries).
- `UPDATE` que sobrescreve campo ausente no request (ADR-0008).
- Agregado calculado em Go depois de buscar linhas, quando deveria ser
  `SUM`/window function (ADR-0007).
- Falta de índice em `WHERE`/`JOIN` frequente (`budget_id`, `item_id`, `cost_id`).
- Migração já aplicada editada em vez de criar uma nova (ADR-0010).
- Migração sem bloco `-- +goose Down` ou com `Down` que não desfaz o `Up`.
- Pool sem `QueryExecModeExec` (colisão de prepared statements no PgBouncer, ADR-0010).
- N+1: query por item dentro de loop quando `JOIN`/`= ANY($1)` resolveria.

## 5. Segurança e validação de entrada
- Rota nova fora do middleware `Auth` sem justificativa (só `/api/v1/health` é pública).
- Payload sem validação (mês fora de 1–12, valor negativo indevido, UUID
  inválido sem `httputil.IsValidUUID`, data sem `httputil.IsValidDate`).
- Body sem limite de tamanho (`http.MaxBytesReader`) em endpoint de escrita.
- Segredo hardcoded em vez de vir de `internal/config`.
- Erro devolvido ao cliente com SQL cru, stack ou connection string.
- CORS mais permissivo que `cfg.AllowedOrigins`.

## 6. Contrato de API e testes
- Resposta de erro fora de `{ "error": "..." }` / sem `httputil.WriteError`.
- Status incorreto (`500` em validação, `200` com corpo de erro, `404` vs `400`).
- Campo divergente de `docs/API.md` (nome, tipo, nulidade). Compare explicitamente.
- `reserve` expondo PATCH/DELETE (ADR-0006).
- ID gerado no cliente aceito sem validar, ou ID não-UUID (ADR-0009).
- Teste cobrindo só o caminho feliz; repository fake sem simular erro.
