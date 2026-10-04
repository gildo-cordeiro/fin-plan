# Checklist de revisão de frontend (por prioridade)

## 1. Corretude de React
- Regras dos Hooks violadas (hook condicional, em loop, ordem instável).
- Dependências de `useEffect`/`useMemo`/`useCallback` incompletas, inclusive as escondidas por `eslint-disable`.
- Stale closure em callbacks assíncronos.
- Mutação direta de estado ou do cache (`setQueryData` recebendo o mesmo
  objeto mutado em vez de um novo; quebra o rollback).
- `key` ausente ou por índice em lista que reordena/filtra (entries, cost items, goals).
- `useState` + `useEffect` sincronizando estado derivado (deveria ser cálculo/`useMemo`).

## 2. Dados e cache (TanStack Query)
- Mutation de edição frequente sem update otimista completo: `onMutate`
  (`cancelQueries` + snapshot + `setQueryData`), `onError` (rollback) e
  `invalidateQueries` no final. Padrão em `src/queries/budget.ts` (ADR-0003).
- Query key montada à mão em vez das factories (`budgetKeys`, `goalKeys`…), ou
  invalidação que não atinge todas as keys afetadas (ex.: mexer numa goal sem
  invalidar o summary do ano).
- `fetch` direto em componente em vez de `budgetApiService` + hook em `src/queries/`.
- Dado do servidor copiado para `useState`/Zustand (duas fontes da verdade).
- Zustand guardando algo além de tema, ano e simulação.
- `localStorage` com dado financeiro (ADR-0003).

## 3. Re-render e performance
- Seletor Zustand que retorna o store inteiro ou um objeto novo a cada render.
- Função/objeto recriado passado a um componente memoizado.
- Agregado recalculado no cliente quando o backend já devolve (ADR-0007).
- Não sinalize virtualização de lista sem evidência de volume (o domínio é pequeno).

## 4. TypeScript e contrato
- `any`, `as X` ou `!` escondendo erro de tipo.
- Divergência entre `src/types/budget.ts` e `docs/API.md` (campo a mais/a menos, tipo, nulidade).
- `null` vs `undefined` contra o contrato (ex.: `actualAmount: number | null`).
- Prop opcional que deveria ser obrigatória (ou o contrário), considerando o uso real.

## 5. Arquitetura, design system e acessibilidade
- Emoji na UI em vez de `lucide-react`.
- Cálculo ou formatação dentro do componente em vez de `services/budgetCalculator.ts`, `hooks/` ou `lib/format.ts`.
- Valor monetário sem `MoneyInput` ou sem `formatBRL`; número sem `font-mono tabular-nums`.
- Primitivo recriado quando já existe em `components/ui/`.
- Componente fora da pasta de domínio (`budget/`, `dashboard/`, `goals/`,
  `layout/`, `modals/`, `simulation/`, `summary/`, `ui/`).
- Cor sem variante `dark:` ou fora da paleta de `apps/web/AGENTS.md`.
- `div`/`span` com `onClick`, input sem label/`aria-label`, modal fora de `ui/Dialog`/`ui/Modal` (perde foco e `Escape`).

## 6. Erros e estados de borda
- Mutation sem `onError` ou sem feedback (`useToast`).
- Query sem estado de loading (`Skeleton`) ou de vazio (`EmptyState`).
- Divisão por zero ou array vazio em percentuais e médias.
- Data/moeda formatada à mão em vez de `lib/format.ts`.
