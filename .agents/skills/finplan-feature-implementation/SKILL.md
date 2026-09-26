---
name: finplan-feature-implementation
description: Use this skill when implementing, extending, or modifying features in the FinPlan app (fin-plan repo) — new fields, entities, UI components, calculations, or API changes. Guides end-to-end feature development respecting FinPlan's Local-First architecture, the single-document MongoDB persistence model, and the conventions documented in docs/ARCHITECTURE.md and docs/API.md.
---

# FinPlan — Feature Implementation Skill

## Objetivo

Guiar a implementação completa (frontend + backend, quando aplicável) de uma nova
funcionalidade no FinPlan, garantindo que a mudança respeite a arquitetura
Local-First existente, o modelo de dados atual e os padrões já documentados no
projeto — em vez de introduzir uma abordagem paralela ou inconsistente.

## Estrutura do Monorepo

O projeto utiliza uma arquitetura monorepo com deploys separados:

```
fin-plan/
├── apps/
│   ├── web/            # Frontend React (SPA)
│   └── api/     # Backend Go (API REST)
├── docs/               # Documentação compartilhada
└── .agents/            # Skills para agentes de IA
```

## Antes de implementar (leitura obrigatória)

1. Leia `docs/ARCHITECTURE.md` — em especial as seções "Decisões Arquiteturais
   Relevantes" (documento único atômico, Local-First, UUIDv4) e "Modelo de Dados".
2. Leia `docs/API.md` se a feature tocar no endpoint `/api/v1/budget` ou exigir
   um endpoint novo.
3. Consulte as skills complementares deste repositório, se relevantes:
   - `.agents/skills/backend-patterns.md` — ao tocar no backend Go
   - `.agents/skills/frontend-patterns.md` — ao tocar em componentes/design system
   - `.agents/skills/git-workflow.md` — para o commit final da feature
4. Identifique se a feature exige alteração no `BudgetState`
   (`apps/web/src/types/budget.ts`). Se sim, trate como **mudança de schema** (ver
   seção dedicada abaixo) — não é uma alteração trivial.

## Fluxo de implementação

1. **Modelo de dados**
   Se necessário, atualize `apps/web/src/types/budget.ts` e a interface
   `BudgetState`. Toda entidade nova precisa de um campo `id: string` gerado via
   `generateId()` (`crypto.randomUUID()`, UUIDv4) — nunca slugs determinísticos.

2. **Motor de cálculo**
   Se a feature afeta projeções, saldo ou métricas, atualize
   `apps/web/src/services/budgetCalculator.ts`. Mantenha as funções puras (sem
   efeitos colaterais, sem chamadas de rede).

3. **Estado global**
   Exponha a nova ação/estado via `apps/web/src/context/BudgetContext.tsx`. Toda
   mutação de estado deve seguir o ciclo de vida já existente:
   - atualizar o estado React imediatamente (0ms de latência percebida)
   - reagendar o debounce de 500ms para `budgetApiService.saveBudget`
     (cancelando qualquer timer anterior pendente)

4. **UI**
   Crie ou edite o componente dentro da pasta de domínio correta em
   `apps/web/src/components/` (`budget/`, `dashboard/`, `simulation/`, `goals/`,
   `months/`, `modals/` ou `ui/` para primitivos reutilizáveis). Siga o design
   system e as convenções descritas em `frontend-patterns.md`.

5. **Backend (somente se necessário)**
   Novos dados devem, por padrão, viver dentro do documento único
   `default_budget` — **não crie uma nova coleção MongoDB** sem justificar
   explicitamente por que o padrão de documento único (ver ARCHITECTURE.md,
   seção 3.3) não se aplica.

   O backend Go está em `apps/api/`:
   - Edite os handlers em `apps/api/internal/budget/handler.go` e
     o repositório em `repository.go`. Siga o padrão de middleware chain
     (CORS → Auth → handler) e timeouts explícitos de contexto (8s).
   - Os models Go em `apps/api/internal/budget/model.go` devem
     ser mantidos em sincronia com os tipos TypeScript do frontend.

6. **Testes**
   Adicione ou atualize testes Vitest em `apps/web/src/__tests__/` cobrindo a
   lógica pura (calculator, storage, api service). Se a feature introduzir um
   fluxo de UI crítico, adicione um teste Playwright em `apps/web/e2e/`.

7. **Documentação**
   - Alterou ou criou endpoint? Atualize `docs/API.md` (payload de exemplo,
     códigos de erro).
   - Alterou modelo de dados ou decisão arquitetural? Atualize
     `docs/ARCHITECTURE.md`, incluindo o diagrama Mermaid ER quando a entidade
     mudar.
   - Alterou estrutura de pastas? Atualize a árvore em `README.md`.

## Mudanças de schema (`BudgetState.version`)

- Toda mudança estrutural no `BudgetState` deve incrementar o campo `version`
  e ser tratada como uma migração explícita em `storageService.ts`, seguindo o
  padrão já usado na migração `v3 -> v4`.
- Nunca remova ou renomeie um campo existente sem uma etapa de migração —
  dados antigos já persistidos no MongoDB Atlas
  precisam continuar sendo lidos corretamente.
- Adicione um teste de migração cobrindo o caso "documento antigo (version N-1)
  chega e é convertido para version N".

## Restrições (não fazer)

- Não introduza chamadas de rede síncronas/bloqueantes na UI — toda escrita
  remota passa pelo debounce de 500ms existente em `BudgetContext`.
- Não crie uma nova coleção MongoDB para a feature sem antes confirmar
  explicitamente com o usuário — o padrão do projeto é documento único atômico
  (`_id: 'default_budget'`).
- Não remova a checagem opcional de `API_SECRET_KEY` no backend Go.
- Não gere IDs determinísticos ou slugs — use sempre `generateId()` (UUIDv4).
- Não implemente resolução de conflitos/CRDT a menos que explicitamente
  solicitado — o projeto assume last-write-wins por design (ver limitação
  conhecida 7.1 em ARCHITECTURE.md).
- Ao final, rode `npm test` e `npm run build` dentro de `apps/web/` e confirme
  que passam antes de considerar a tarefa concluída.

## Exemplo (few-shot)

**Pedido do usuário**:
"Adicione uma categoria à meta financeira (ex: viagem, emergência, compra),
selecionável na criação da meta."

**Ação esperada do agente**:
1. Adicionar `goalCategory: string` à interface `FinancialGoal` em
   `apps/web/src/types/budget.ts`.
2. Incrementar `BudgetState.version` e adicionar a migração correspondente em
   `storageService.ts` (metas antigas sem `goalCategory` recebem um valor
   padrão, ex: `"outros"`).
3. Atualizar o formulário de criação/edição de meta em
   `apps/web/src/components/goals/` para incluir o seletor de categoria,
   seguindo o design system.
4. Atualizar `docs/API.md` (payload de exemplo do `POST /api/v1/budget` com o
   novo campo) e `docs/ARCHITECTURE.md` (entidade `FINANCIAL_GOAL` no diagrama
   ER).
5. Adicionar/atualizar testes cobrindo a migração e, se aplicável, qualquer
   lógica de cálculo afetada.
