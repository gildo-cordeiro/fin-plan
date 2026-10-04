# FinPlan API

A API do FinPlan segue o modelo **Spec-Driven Development** utilizando o OpenAPI 3.1.

**A FONTE DA VERDADE AGORA É O ARQUIVO `docs/openapi.yaml`.**

Este arquivo (`API.md`) foi mantido apenas como um redirecionamento histórico. Para ver os endpoints, modelos, e payloads, consulte diretamente o arquivo `openapi.yaml`.

## Fluxo de Trabalho (Spec-Driven)

1. **Alteração na API:** Sempre que um novo endpoint ou campo for necessário, você **deve** começar editando o `docs/openapi.yaml`.
2. **Backend (Go):** Após atualizar o YAML, entre em `apps/api` e rode `go generate ./...`. Isso vai atualizar os stubs e o `StrictServerInterface` em `apps/api/internal/api/api.gen.go`. Em seguida, implemente a lógica nova em `apps/api/internal/api/server_impl.go`.
3. **Frontend (React):** No frontend, entre em `apps/web` e rode `npm run generate` (que executa `openapi-typescript`). Em seguida, consuma as novas tipagens usando o cliente `openapi-fetch`.

Para mais detalhes da decisão arquitetural, veja [ADR 0012](adrs/0012-adocao-spec-driven-development-openapi.md).
