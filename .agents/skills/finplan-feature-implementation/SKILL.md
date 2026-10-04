---
name: finplan-feature-implementation
description: >-
  Use when implementing, extending or changing a feature in the FinPlan repo
  (fin-plan): new field, entity, endpoint, screen, component, calculation or
  bug fix that touches apps/web and/or apps/api. Also triggers on Portuguese
  requests like "implementar", "adicionar campo", "criar tela", "nova
  funcionalidade", "corrigir bug". Not for read-only reviews (use
  finplan-backend-review / finplan-frontend-review) nor for writing issues
  (use finplan-issue-creation).
---

# FinPlan — Implementação de Feature

As convenções de código já são carregadas pelos `AGENTS.md` (raiz,
`apps/api/`, `apps/web/`). Esta skill define só o **procedimento**.

## 0. Preparar

1. Se houver issue, leia a issue inteira: critérios de aceite, escopo e "não inclui".
2. Leia as seções relevantes de `docs/ARCHITECTURE.md` e, se a feature tocar a
   API, `docs/openapi.yaml`. Leia os ADRs de `docs/adrs/` ligados à área.
3. Crie a branch seguindo `finplan-pr-workflow` (passo 1).
4. Classifique a mudança e pule as etapas que não se aplicam:
   - **Schema** (tabela/coluna nova) → siga [references/schema-change.md](references/schema-change.md).
   - **Só frontend** → etapas 3–5.
   - **Só backend** → etapas 1–2 e 5.

## 1. Backend (`apps/api`)

1. Domínio: ajuste o modelo e as invariantes em `internal/<feature>/<feature>.go`
   e escreva o teste primeiro em `service_test.go` ou `<feature>_test.go`.
2. Entrada: DTO + validação em `requests.go` (PATCH com ponteiros).
3. Persistência: queries em `repository.go`, recebendo o `ctx` e usando `pgx.Tx`
   quando houver múltiplas escritas.
4. Orquestração em `service.go`; HTTP em `handler.go`; rota e wiring em `internal/app/app.go`.
5. Rode `go test ./...` em `apps/api` antes de seguir.

## 2. Contrato

1. Atualize `docs/openapi.yaml` com o payload de exemplo e os códigos de erro.
2. Espelhe o contrato em `apps/web/src/types/budget.ts` e
   `apps/web/src/services/budgetApiService.ts`, e atualize
   `src/__tests__/budgetApiService.test.ts`.

## 3. Lógica de frontend (TDD)

1. Se houver regra de cálculo: escreva o teste em
   `src/__tests__/budgetCalculator.test.ts` **antes** de implementar em
   `src/services/budgetCalculator.ts` (funções puras).
2. Crie ou ajuste os hooks de query/mutation em `src/queries/<domínio>.ts`
   (update otimista para edições frequentes; veja `queries/budget.ts`).
3. `npm test` em `apps/web` deve passar antes de mexer na UI.

## 4. UI

1. Componente na pasta de domínio correta, reutilizando `components/ui/`.
2. Estados de loading (`Skeleton`), vazio (`EmptyState`) e erro (`useToast`).
3. Confira light e dark mode.

## 5. Documentação e validação

1. **Auto-atualização do Agente (Manutenção Viva)**:
   - Endpoint novo/alterado? Atualize `docs/openapi.yaml`.
   - Estrutura de pastas ou tecnologia? Atualize `README.md` e `docs/ARCHITECTURE.md`.
   - Instruções defasadas? Atualize os arquivos `AGENTS.md` e as suas próprias skills em `.agents/skills/`.
   - **Mudança Arquitetural (ADR)**: Se você fez uma mudança que quebra ou altera uma decisão arquitetural existente, **pause e pergunte ao usuário** se deve criar um novo ADR (em `docs/adrs/`). Lembre-se: ADRs antigos são registros históricos imutáveis; nunca apague ou altere a decisão de um ADR passado, sempre crie um novo.
2. Rode a validação e corrija até passar:
   ```bash
   .agents/skills/finplan-feature-implementation/scripts/validate.sh
   ```
3. Abra o PR seguindo `finplan-pr-workflow`.

## Exemplo

**Pedido:** "Adicione uma categoria à meta financeira (viagem, emergência,
compra), selecionável na criação."

1. Migração Goose `0000N_add_goal_category.sql` (`ALTER TABLE goal ADD COLUMN category TEXT`).
2. `internal/goal/goal.go` com o campo novo, `requests.go` validando os valores
   aceitos e `repository.go` com a coluna nos `SELECT`/`INSERT`/`UPDATE`; teste em `service_test.go`.
3. `docs/openapi.yaml` e o diagrama ER em `docs/ARCHITECTURE.md`.
4. `FinancialGoal.category` em `src/types/budget.ts` e o seletor em
   `components/modals/NewGoalModal.tsx`, usando `ui/Select`.
5. `validate.sh` e depois o PR com `Closes #N`.
