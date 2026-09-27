---
name: finplan-backend-review
description: Use this skill when asked to review, audit, or critique FinPlan's Go/PostgreSQL backend (apps/api) in depth — a handler, a repository, a PR diff, or the codebase as a whole. Covers Go correctness (errors, context, concurrency), the handler/service/repository layering, SQL/transaction correctness, security, and API contract consistency. Not for implementing new features (see finplan-feature-implementation) — this is read-only critique.
---

# FinPlan — Deep Backend Review Skill

## Objetivo

Fazer uma revisão de código aprofundada do backend Go/PostgreSQL do FinPlan
(`apps/api`) — não um "parece bom", mas uma análise categorizada com
severidade, localização exata (arquivo:linha) e justificativa técnica de
cada ponto levantado. Esta skill é read-only por padrão: aponta problemas e
sugere correções, mas só edita código se o usuário pedir explicitamente.

## Escopo da revisão

Analisar (o que estiver no alvo do pedido — um arquivo, um pacote ou
`apps/api` inteiro) contra as seis dimensões abaixo, nesta ordem de
prioridade:

### 1. Corretude de Go (bugs reais, não estilo)
- Erro ignorado (`_ = f()` ou erro não checado) em qualquer chamada que pode
  falhar — especialmente I/O (Postgres, rede, arquivo).
- Erro relançado sem contexto (`return err` em vez de
  `fmt.Errorf("contexto: %w", err)`) — dificulta debug em produção.
- `nil` pointer não verificado antes de dereferência, principalmente em
  campos opcionais (`*float64`, `*string`) usados no padrão de PATCH parcial
  já estabelecido no projeto.
- `defer` em loop (acumula recursos até o fim da função, não do escopo do
  loop) — comum em handlers que iteram sobre múltiplos registros.
- Slices/maps compartilhados entre goroutines sem sincronização.
- Shadowing de variável (`err` redeclarado com `:=` escondendo um erro
  anterior não tratado).

### 2. Contexto, concorrência e recursos
- `context.Context` não propagado até a chamada ao banco (query rodando sem
  timeout herdado do request) — todo acesso a Postgres deve receber o `ctx`
  da requisição, não `context.Background()`.
- Timeout de banco ausente no contexto passado para a query (todo acesso externo
  deve ter um prazo definido, ex: 8s).
- Conexão com banco criada por request em vez de reutilizar o pool singleton
  configurado no boot (`main.go`).
- Goroutine disparada sem forma de esperar/cancelar (`go func(){...}()` solta
  sem `WaitGroup`/canal, arriscando vazamento ou execução após o processo
  responder).
- Graceful shutdown ausente ou incompleto — `SIGTERM`/`SIGINT` devem fechar
  o pool de conexões e o listener HTTP antes de encerrar (crítico rodando em
  container/Docker).
- Race condition em estado compartilhado entre handlers (variável de pacote
  mutável sem mutex).

### 3. Camadas e arquitetura (handler → service → repository)
- Handler acessando o banco diretamente (import de `pgx`/driver dentro de
  `handler.go`) — viola a regra já estabelecida de que só `repository.go`
  conhece o banco.
- Regra de negócio implementada no handler em vez do service (ex:
  validação de schema, cálculo, decisão condicional que não é sobre
  HTTP/JSON).
- Interface criada sem necessidade real de troca de implementação (excesso
  de abstração) — o padrão do projeto é interface só no repository.
- Injeção de dependência via framework/container em vez de composição manual
  no `main.go` — o projeto decidiu explicitamente não usar `wire`/`fx`.
- Entidade nova fora do pacote `internal/<feature>/` (organização por
  camada global em vez de por feature).

### 4. SQL, transações e schema
- Query concatenando string com input do usuário (SQL injection) em vez de
  usar parâmetros (`$1`, `$2`, ...).
- Múltiplas escritas relacionadas fora de uma transação (ex: criar `item` e
  gerar as 12 `entry` deve ser atômico — tudo ou nada; sinalizar se não
  estiver usando `BEGIN`/`COMMIT`/`ROLLBACK` ou `pgx.Tx`).
- `UPDATE`/`PATCH` que sobrescreve campos não presentes no request — viola o
  requisito explícito de PATCH parcial (usar ponteiros para distinguir
  "campo ausente" de "campo zerado"; ver `docs/API.md`).
- Cálculo agregado (somas, saldo acumulado) feito em Go após buscar linhas
  quando deveria ser `SUM`/window function no SQL (decisão já tomada de que
  `GetMonthlySummary`/totais de `cost` são responsabilidade do banco, não da
  aplicação).
- Falta de índice em coluna usada em `WHERE`/`JOIN` frequente
  (`budget_id`, `item_id`, `cost_id`).
- Migration que edita uma migration já aplicada em vez de criar uma nova
  versionada via Goose (ADR-0010).
- Nova conexão do `pgxpool` instanciada com `QueryExecModeCacheStatement` (padrão
  do pgx v5) em vez de `QueryExecModeExec`, o que causaria colisões no PgBouncer 
  em modo transaction (ADR-0010).
- `N+1 query` — buscar uma lista e depois fazer uma query por item dentro de
  um loop, quando um `JOIN`/`IN (...)` resolveria em uma chamada.

### 5. Segurança e validação de entrada
- Endpoint sem a checagem de `API_SECRET_KEY` (middleware de auth) quando
  deveria tê-la — conferir contra a lista de rotas públicas documentada.
- Payload JSON decodificado sem validação de tipo/formato antes de usar (ex:
  `month` fora do intervalo 1–12, valores negativos onde não fazem sentido).
- Segredo (chave, connection string) hardcoded no código em vez de vir de
  variável de ambiente.
- Mensagem de erro retornada ao cliente vazando detalhe interno sensível
  (stack trace, connection string, nome de tabela em erro de SQL cru).
- CORS mais permissivo do que o necessário sem justificativa.

### 6. Contrato de API e tratamento de erro
- Resposta de erro fora do formato padrão `{ "error": "mensagem" }` já
  estabelecido no projeto.
- Status HTTP incorreto para o caso (ex: `500` para erro de validação que
  deveria ser `400`, ou `200` com corpo de erro).
- Campo de resposta divergente do contrato documentado em `docs/API.md`
  (nome de campo, tipo, nulidade) — comparar explicitamente contra a spec.
- Endpoint que deveria ser somente leitura/criação (ex: `reserve_movement`,
  documentado como livro-razão imutável) expondo `PATCH`/`DELETE`.
- Ausência de teste cobrindo o caminho de erro (só o caminho feliz testado).

## Como reportar

Para cada problema encontrado, reportar no formato:

```
[SEVERIDADE] arquivo.go:linha — título curto do problema
  Por quê: explicação técnica objetiva (1-3 frases)
  Sugestão: o que fazer a respeito (sem necessariamente já implementar)
```

Severidade: `CRÍTICO` (bug real — corrompe dado, vaza segredo, quebra em
produção, ou permite acesso indevido), `IMPORTANTE` (não quebra hoje, mas é
dívida técnica real, risco de regressão, ou viola uma decisão arquitetural
já documentada), `MENOR` (estilo, consistência, nit).

Agrupar o relatório final pelas 6 dimensões acima, não por arquivo — isso
facilita ver se há um padrão sistêmico (ex: "nenhum handler propaga o
context corretamente") em vez de uma lista plana difícil de priorizar.

Terminar o relatório com um resumo de contagem por severidade e, se houver
qualquer item `CRÍTICO` nas dimensões 4 (SQL/transações) ou 5 (segurança),
recomendar explicitamente não mergear/deployar até resolver.

## Restrições

- Não corrigir o código automaticamente a menos que o usuário peça
  explicitamente ("revisa" ≠ "revisa e corrige").
- Não repetir achados que `go vet`/linter já cobre mecanicamente — focar no
  que exige julgamento (arquitetura, transação, contrato), não no que é
  sintático.
- Não sinalizar estilo puramente subjetivo sem base nas convenções já
  documentadas (`backend-patterns.md`, `ARCHITECTURE.md`) — toda crítica de
  estilo precisa apontar para um padrão existente no projeto.
- Não avaliar o frontend nesta skill — se o problema é sobre consumo da API
  no React, é escopo de `finplan-frontend-review`, não desta.
