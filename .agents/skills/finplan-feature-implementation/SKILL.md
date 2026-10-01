---
name: finplan-feature-implementation
description: Use this skill when implementing, extending, or modifying features in the FinPlan app (fin-plan repo) — new fields, entities, UI components, calculations, or API changes. Guides end-to-end feature development respecting FinPlan's PostgreSQL relational persistence, Goose-managed migrations, and the conventions documented in docs/ARCHITECTURE.md and docs/API.md.
---

# FinPlan — Feature Implementation Skill

## Objetivo

Guiar a implementação completa (frontend + backend, quando aplicável) de uma nova
funcionalidade no FinPlan, garantindo que a mudança respeite a arquitetura
existente, o modelo de dados atual e os padrões já documentados no
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
   Relevantes" e "Modelo de Dados".
2. Leia `docs/API.md` se a feature tocar na API ou exigir
   um endpoint novo.
3. Consulte as skills complementares deste repositório, se relevantes:
   - `.agents/skills/finplan-backend-review/SKILL.md`
   - `.agents/skills/finplan-frontend-review/SKILL.md`
   - `.agents/skills/finplan-issue-creation/SKILL.md`
4. Identifique se a feature exige alteração no schema do banco de dados. Se sim, trate como **mudança de schema** (ver
   seção dedicada abaixo) — não é uma alteração trivial.

## Fluxo de implementação

1. **Modelo de dados**
   Se necessário, atualize `apps/web/src/types/budget.ts`. Toda entidade nova precisa de um campo `id: string` gerado via
   `generateId()` (`crypto.randomUUID()`, UUIDv4) — nunca slugs determinísticos.

2. **Motor de cálculo**
   Se a feature afeta projeções, saldo ou métricas, atualize
   `apps/web/src/services/budgetCalculator.ts`. Mantenha as funções puras (sem
   efeitos colaterais, sem chamadas de rede).

3. **Estado global**
   O frontend utiliza TanStack Query para data fetching e mutations. O estado é gerenciado via uma store Zustand (para preferências locais como tema e simulação) e cache do React Query (para dados do servidor). As mutations usam hooks `useMutation` em `src/queries/` com optimistic updates e `invalidateQueries` no sucesso.

4. **UI**
   Crie ou edite o componente dentro da pasta de domínio correta em
   `apps/web/src/components/` (`budget/`, `dashboard/`, `simulation/`, `goals/`,
   `months/`, `modals/` ou `ui/` para primitivos reutilizáveis). Siga o design
   system e as convenções descritas na documentação de frontend.

5. **Backend (somente se necessário)**
   - Novos dados vão para tabelas existentes ou novas tabelas através de migrações Goose em `apps/api/migrations/`.
   - Siga o padrão existente de handler → service → repository em `apps/api/internal/`.
   - Utilize pgx/v5 para as queries no banco de dados.
   - Mantenha os models Go em sincronia com os tipos TypeScript do frontend.

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

## Mudanças de schema

- As mudanças de schema usam migrações Goose (`apps/api/migrations/`). Crie um novo arquivo de migração com `goose create <name> sql`.
- Os tipos do frontend em `src/types/budget.ts` devem ser atualizados para coincidir.
- O localStorage guarda apenas preferências de simulação (schema v5) — nenhuma migração de dados no frontend é necessária.

## Restrições (não fazer)

- Use sempre ícones do pacote `lucide-react` em vez de emojis hardcoded (ex: 🚚, ⚠️) ou outras bibliotecas de ícones na UI.
- Não inclua comentários no código gerado a menos que sejam estritamente
  necessários para explicar decisões não-óbvias (workarounds, regras de
  negócio contraintuitivas ou referências a limitações externas). Comentários
  que apenas descrevem o que o código já deixa claro por si só (nomes de
  função, tipos, fluxo óbvio) são proibidos.
  - Proibido: `// incrementa o contador` acima de `count++`.
  - Aceitável: `// Banco de dados trunca timestamps em ms; ver docs/API.md` acima de uma conversão de data específica.
- Não viole as boas práticas idiomáticas da linguagem/stack utilizada (Go no
  backend, React/TypeScript no frontend) — mantenha nomes descritivos, funções
  pequenas e coesas, tratamento de erro explícito, sem duplicação desnecessária
  e sem código morto.
- Não introduza chamadas de rede síncronas/bloqueantes na UI — mutations devem passar pelos hooks do TanStack Query em `src/queries/`.
- Não remova a checagem opcional de `API_SECRET_KEY` no backend Go.
- Não gere IDs determinísticos ou slugs — use sempre `generateId()` (UUIDv4).
- Sempre abra um Pull Request (utilizando o github MCP via create_branch e create_pull_request) para a implementação da feature e cite a issue correspondente (ex: `Closes #123` no corpo do PR).
- Ao final, rode `npm test` e `npm run build` dentro de `apps/web/` e confirme
  que passam antes de considerar a tarefa concluída.

## Exemplo (few-shot)

**Pedido do usuário**:
"Adicione uma categoria à meta financeira (ex: viagem, emergência, compra),
selecionável na criação da meta."

**Ação esperada do agente**:
1. Adicionar `goalCategory: string` à interface `FinancialGoal` em
   `apps/web/src/types/budget.ts`.
2. Criar migração Goose em `apps/api/migrations/` adicionando coluna `goal_category TEXT` à tabela `goal`.
3. Atualizar o formulário de criação/edição de meta em
   `apps/web/src/components/goals/` para incluir o seletor de categoria,
   seguindo o design system.
4. Atualizar o modelo Go correspondente em `apps/api/internal/goal/model.go` e `docs/API.md` (payload de exemplo do `POST /api/v1/budget` com o
   novo campo), além de `docs/ARCHITECTURE.md` (entidade `FINANCIAL_GOAL` no diagrama
   ER).
5. Adicionar/atualizar testes cobrindo a migração e, se aplicável, qualquer
   lógica de cálculo afetada.
