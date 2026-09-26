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

## Antes de implementar (leitura obrigatória)

1. Leia `docs/ARCHITECTURE.md` — em especial as seções "Decisões Arquiteturais
   Relevantes" (documento único atômico, Local-First, UUIDv4) e "Modelo de Dados".
2. Leia `docs/API.md` se a feature tocar no endpoint `/api/budget` ou exigir um
   endpoint novo.
3. Consulte as skills complementares deste repositório, se relevantes:
   - `.agents/skills/backend-patterns.md` — ao tocar em `api/budget.ts`
   - `.agents/skills/frontend-patterns.md` — ao tocar em componentes/design system
   - `.agents/skills/git-workflow.md` — para o commit final da feature
4. Identifique se a feature exige alteração no `BudgetState`
   (`src/types/budget.ts`). Se sim, trate como **mudança de schema** (ver seção
   dedicada abaixo) — não é uma alteração trivial.

## Fluxo de implementação

1. **Modelo de dados**
   Se necessário, atualize `src/types/budget.ts` e a interface `BudgetState`.
   Toda entidade nova precisa de um campo `id: string` gerado via
   `generateId()` (`crypto.randomUUID()`, UUIDv4) — nunca slugs determinísticos.

2. **Motor de cálculo**
   Se a feature afeta projeções, saldo ou métricas, atualize
   `src/services/budgetCalculator.ts`. Mantenha as funções puras (sem efeitos
   colaterais, sem chamadas de rede).

3. **Estado global**
   Exponha a nova ação/estado via `src/context/BudgetContext.tsx`. Toda mutação
   de estado deve seguir o ciclo de vida já existente:
   - atualizar o estado React imediatamente (0ms de latência percebida)
   - espelhar no `localStorage` sob a chave `finplan-app-data-v4`
   - reagendar o debounce de 500ms para `budgetApiService.saveBudget`
     (cancelando qualquer timer anterior pendente)

4. **UI**
   Crie ou edite o componente dentro da pasta de domínio correta em
   `src/components/` (`budget/`, `dashboard/`, `simulation/`, `goals/`,
   `months/`, `modals/` ou `ui/` para primitivos reutilizáveis). Siga o design
   system e as convenções descritas em `frontend-patterns.md`.

5. **Backend (somente se necessário)**
   Novos dados devem, por padrão, viver dentro do documento único
   `default_budget` — **não crie uma nova coleção MongoDB** sem justificar
   explicitamente por que o padrão de documento único (ver ARCHITECTURE.md,
   seção 3.3) não se aplica. Se for necessário um endpoint novo, siga o padrão
   já usado em `api/budget.ts`:
   - conexão singleton via `MongoClient` com `serverSelectionTimeoutMS: 8000`
   - helper `reply(res, status, data)` para respostas compatíveis com Vercel e
     com o middleware SSR local
   - tratamento de `req.body` como objeto, string ou stream bruta
   - checagem opcional de `API_SECRET_KEY` via header `x-api-key` ou
     `Authorization: Bearer`
   - resposta `200` imediata em `OPTIONS`, `405` para verbos não suportados

6. **Testes**
   Adicione ou atualize testes Vitest em `src/__tests__/` cobrindo a lógica
   pura (calculator, storage, api service). Se a feature introduzir um fluxo de
   UI crítico, adicione um teste Playwright em `e2e/`.

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
  dados antigos já persistidos no MongoDB Atlas e no `localStorage` dos
  usuários precisam continuar sendo lidos corretamente.
- Adicione um teste de migração cobrindo o caso "documento antigo (version N-1)
  chega e é convertido para version N".

## Restrições (não fazer)

- Não introduza chamadas de rede síncronas/bloqueantes na UI — toda escrita
  remota passa pelo debounce de 500ms existente em `BudgetContext`.
- Não crie uma nova coleção MongoDB para a feature sem antes confirmar
  explicitamente com o usuário — o padrão do projeto é documento único atômico
  (`_id: 'default_budget'`).
- Não remova a checagem opcional de `API_SECRET_KEY` em `api/budget.ts`.
- Não gere IDs determinísticos ou slugs — use sempre `generateId()` (UUIDv4).
- Não implemente resolução de conflitos/CRDT a menos que explicitamente
  solicitado — o projeto assume last-write-wins por design (ver limitação
  conhecida 7.1 em ARCHITECTURE.md).
- Ao final, rode `npm test` e `npm run build` e confirme que passam antes de
  considerar a tarefa concluída.

## Exemplo (few-shot)

**Pedido do usuário**:
"Adicione uma categoria à meta financeira (ex: viagem, emergência, compra),
selecionável na criação da meta."

**Ação esperada do agente**:
1. Adicionar `goalCategory: string` à interface `FinancialGoal` em
   `src/types/budget.ts`.
2. Incrementar `BudgetState.version` e adicionar a migração correspondente em
   `storageService.ts` (metas antigas sem `goalCategory` recebem um valor
   padrão, ex: `"outros"`).
3. Atualizar o formulário de criação/edição de meta em `src/components/goals/`
   para incluir o seletor de categoria, seguindo o design system.
4. Atualizar `docs/API.md` (payload de exemplo do `POST /api/budget` com o novo
   campo) e `docs/ARCHITECTURE.md` (entidade `FINANCIAL_GOAL` no diagrama ER).
5. Adicionar/atualizar testes cobrindo a migração e, se aplicável, qualquer
   lógica de cálculo afetada.
