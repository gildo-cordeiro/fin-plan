# apps/web — Regras de Frontend (React + TypeScript)

## Estado e dados

- **Dados do servidor**: TanStack Query. Hooks em `src/queries/` (`budget.ts`,
  `costs.ts`, `goals.ts`), com query keys centralizadas (`budgetKeys`, `goalKeys`…).
- **Mutations**: `useMutation` em `src/queries/`. Para edições frequentes, use
  update otimista (`onMutate` → `setQueryData` com snapshot, `onError` →
  rollback, `onSettled`/`onSuccess` → `invalidateQueries`). Referência:
  `src/queries/budget.ts` (ADR-0003).
- **Estado local**: Zustand em `src/store/useBudgetStore.ts`, só para tema, ano
  corrente e parâmetros de simulação.
- **HTTP**: só via `src/services/budgetApiService.ts`. Componentes nunca chamam `fetch`.
- **localStorage**: só preferências (`src/services/storageService.ts`). Dado
  financeiro é persistido no PostgreSQL, nunca no browser.
- Feedback ao usuário com `useToast()` (`src/context/ToastContext.tsx`).

## Cálculo e formatação

- Regras financeiras puras em `src/services/budgetCalculator.ts` e hooks
  derivados em `src/hooks/`; nada de cálculo dentro de componente.
- Agregados que o backend já devolve (summary, saldo acumulado) não devem ser
  recalculados no cliente (ADR-0007).
- Formatação pt-BR só por `src/lib/format.ts` (`formatBRL`, `formatCompactBRL`,
  `formatPercent`, `formatDecimalBR`, `parseDecimalBR`).
- Classes condicionais via `cn()` de `src/lib/cn.ts`.

## Componentes

- Pastas por domínio em `src/components/`: `budget/`, `dashboard/`, `goals/`,
  `layout/`, `modals/`, `simulation/`, `summary/`; primitivos reutilizáveis em `ui/`.
- Reuse `ui/` antes de criar: `Button`, `Card`, `Input`, `MoneyInput` (todo
  valor monetário), `Select`, `Slider`, `Dialog`/`Modal`, `Popover`,
  `CollapsibleSection`, `Badge`, `Alert`, `EmptyState`, `Skeleton`.
- Ícones: só `lucide-react`, sem emojis.
- Valores numéricos com `font-mono tabular-nums`.
- Toda cor com variante `dark:`. Paleta: primária `#0e6b7a`/`#4ec2d3`;
  entradas `emerald-*`; reserva/atenção `amber-*`; déficit `rose-*`; fundos
  `#f4f6f8` / `#0b1116`.
- Acessibilidade: elementos interativos são `button`/`a`, inputs com label ou
  `aria-label`, modais fecham com `Escape` e prendem o foco (Radix já cuida disso).

## Tipos

- Tipos de domínio em `src/types/budget.ts`, alinhados com `docs/API.md` e os
  DTOs Go. Sem `any`; `as` só com justificativa.
- `null` vs `undefined` segue o contrato da API (ex.: `actualAmount: number | null`).

## Testes e validação

- Vitest em `src/__tests__/` para lógica pura (calculator, format, storage, api service).
- Validação: `npm run lint && npm test && npm run build` (dentro de `apps/web`).
