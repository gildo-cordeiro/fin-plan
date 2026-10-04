# ADR 0012: Adoção de Spec-Driven Development com OpenAPI

## Status
Aceito

## Contexto
O projeto documentava suas APIs manualmente no arquivo `docs/API.md`. Com a evolução constante, os modelos e stubs da API tornaram-se difíceis de manter sincronizados com o código (Go) e o front-end (React/TypeScript).

## Decisão
Decidimos migrar de um modelo de "Documentation-Driven" manual para **Spec-Driven Development (SDD)** utilizando **OpenAPI 3.1** como fonte da verdade.

1. **Fonte da Verdade:** `docs/openapi.yaml` agora contém todos os endpoints e schemas. O `docs/API.md` antigo pode ser removido ou considerado obsoleto.
2. **Backend (Go):** Utilizamos `oapi-codegen` com os módulos `models` e `strict-server` para gerar stubs e parsers, forçando as respostas e requisições do Go a obedecerem ao contrato YAML (`apps/api/internal/api/api.gen.go`).
3. **Frontend (React):** Utilizamos `openapi-typescript` para gerar interfaces rigorosas e `openapi-fetch` para fazer requisições fortemente tipadas de ponta a ponta (`apps/web/src/types/api.d.ts`).

## Consequências
- **Vantagens:** Tipagem end-to-end, menor chance de quebrar contratos via mudanças acidentais, eliminação de código de validação de request manual (tudo no `StrictServer`).
- **Desvantagens:** Qualquer mudança de API requer editar o YAML e rodar os geradores (`go generate` e `npm run generate`) antes de implementar a lógica de fato.
