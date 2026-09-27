---
name: finplan-frontend-review
description: Use this skill when asked to review, audit, or critique FinPlan's React/TypeScript frontend (src/) in depth — a component, a PR diff, or the codebase as a whole. Covers React correctness (hooks, re-renders, effects), TypeScript strictness, architecture/consistency with BudgetContext and the design system, accessibility, and performance. Not for implementing new features (see finplan-feature-implementation) — this is read-only critique.
---

# FinPlan — Deep Frontend Review Skill

## Objetivo

Fazer uma revisão de código aprofundada do frontend React/TypeScript do
FinPlan — não um "parece bom", mas uma análise categorizada com severidade,
localização exata (arquivo:linha) e justificativa técnica de cada ponto
levantado. Esta skill é read-only por padrão: aponta problemas e sugere
correções, mas só edita código se o usuário pedir explicitamente.

## Escopo da revisão

Analisar (o que estiver no alvo do pedido — um arquivo, um diretório ou o
`src/` inteiro) contra as seis dimensões abaixo, nesta ordem de prioridade:

### 1. Corretude de React (bugs reais, não estilo)
- Regras dos Hooks violadas (hook condicional, hook em loop, ordem instável).
- Dependências de `useEffect`/`useMemo`/`useCallback` incompletas ou
  desnecessárias (usar a lista de deps real, não a que o linter aceita
  silenciosamente se houver `eslint-disable`).
- Closures obsoletas (`stale closure`) capturando estado antigo dentro de
  callbacks assíncronos ou handlers.
- Mutação direta de estado (array/objeto mutado em vez de substituído) —
  crítico especialmente em `BudgetContext.tsx`, onde a atualização otimista
  depende de criar um novo objeto para o rollback funcionar corretamente.
- Chaves (`key`) de lista ausentes, ou usando índice do array quando a lista
  pode reordenar/filtrar (ex: listas de `entries`, `costItems`).
- Efeitos que deveriam ser cálculo derivado (`useMemo`) em vez de
  `useState` + `useEffect` sincronizando dois estados.

### 2. Re-renders e performance
- Componentes grandes re-renderizando por mudança de estado que não os
  afeta — identificar se o contexto (`BudgetContext`) está causando
  re-render em cascata desnecessário (contexto único grande vs. contextos
  segmentados).
- Funções/objetos recriados a cada render sendo passados como prop para
  componentes memoizados (quebra o `React.memo`).
- Falta de memoização em cálculos custosos usados em render (ex: agregações
  sobre `entries`/`costItems` que deveriam vir prontas do backend, conforme
  a decisão já tomada de mover cálculo para o `summary` — sinalizar se algum
  componente ainda recalcula isso no cliente).
- Listas grandes sem virtualização, se aplicável ao volume de dados real do
  domínio (meses, items — geralmente pequeno, então isso raramente é um
  problema real aqui; não sinalizar sem evidência de volume).

### 3. TypeScript
- Uso de `any` ou type assertions (`as X`) que escondem um erro de tipo em
  vez de corrigi-lo.
- Tipos duplicados ou divergentes entre frontend (`src/types/budget.ts`) e o
  contrato real da API (`docs/API.md`) — sinalizar qualquer campo que exista
  num lado e não no outro.
- Uso de `null`/`undefined` inconsistente onde o schema do backend define
  claramente um dos dois (ex: `Entry.actualAmount: number | null` — nunca
  `undefined`).
- Props opcionais que deveriam ser obrigatórias (ou vice-versa) dado o uso
  real do componente.

### 4. Arquitetura e consistência
- Componente fazendo chamada de API diretamente em vez de passar por
  `budgetApiService.ts`/`BudgetContext`.
- Lógica de negócio (cálculo, formatação financeira) implementada dentro de
  um componente de UI em vez de `src/services/`ou `src/utils/`.
- Ação de escrita que não segue o padrão `optimisticUpdate` já estabelecido
  em `BudgetContext.tsx` (atualização direta sem rollback em caso de falha).
- Componente fora da pasta de domínio correta (`budget/`, `dashboard/`,
  `simulation/`, `goals/`, `months/`, `modals/`, `ui/`) — sinalizar
  violação da convenção documentada em `frontend-patterns.md`.
- Duplicação de um padrão que já existe como componente reutilizável em
  `src/components/ui/`.
- Uso indevido de `localStorage` para persistir dados financeiros — alertar que
  o projeto abandonou o local-first; o browser deve armazenar apenas preferências
  (tema) e variáveis de simulação percentual (ADR-0003). Toda persistência real
  deve ir para o PostgreSQL.

### 5. Acessibilidade
- Elementos interativos (`div`/`span` com `onClick`) que deveriam ser
  `button`/`a` nativos.
- Inputs sem `label` associado (via `htmlFor`/`id` ou `aria-label`).
- Contraste de cor não verificável estaticamente — apenas sinalizar uso de
  cores fora da paleta documentada (`frontend-patterns.md`), não tentar
  calcular contraste.
- Falta de `aria-live` em áreas que mudam de conteúdo dinamicamente sem
  interação direta do usuário (ex: toast de erro do rollback otimista).
- Navegação por teclado quebrada em modais (foco não preso, `Escape` não
  fecha).

### 6. Tratamento de erro e estados de borda
- Chamada de API sem tratamento de erro (sem try/catch, sem rollback
  otimista, sem feedback ao usuário).
- Estado de loading ausente em operação assíncrona visível ao usuário.
- Divisão por zero ou acesso a array vazio não tratado em cálculos
  financeiros (ex: médias, percentuais).
- Formatação de moeda/data não usando os helpers centralizados de
  `src/utils/formatters.ts` (duplicação de lógica de formatação pt-BR).

## Como reportar

Para cada problema encontrado, reportar no formato:

```
[SEVERIDADE] arquivo.tsx:linha — título curto do problema
  Por quê: explicação técnica objetiva (1-3 frases)
  Sugestão: o que fazer a respeito (sem necessariamente já implementar)
```

Severidade: `CRÍTICO` (bug real, causa comportamento incorreto ou quebra em
produção), `IMPORTANTE` (não quebra hoje, mas é dívida técnica real ou risco
de regressão), `MENOR` (estilo, consistência, nit).

Agrupar o relatório final pelas 6 dimensões acima, não por arquivo — isso
facilita ver se há um padrão sistêmico (ex: "todos os modais têm o mesmo
problema de foco") em vez de uma lista plana difícil de priorizar.

Terminar o relatório com um resumo de contagem por severidade e, se houver
mais de 2 `CRÍTICO`, recomendar explicitamente não mergear/deployar até
resolver.

## Restrições

- Não corrigir o código automaticamente a menos que o usuário peça
  explicitamente ("revisa" ≠ "revisa e corrige").
- Não repetir achados já cobertos por lint/CI automatizado (se o projeto
  tiver ESLint configurado, não reportar o que o linter já pegaria — focar
  no que exige julgamento, não no que é mecânico).
- Não sinalizar estilo de código puramente subjetivo sem base nas convenções
  já documentadas em `frontend-patterns.md` — toda crítica de estilo precisa
  apontar para um padrão existente no projeto, não para preferência pessoal.
- Não avaliar o backend nesta skill — se o problema está no contrato de API
  ou em uma query, é escopo de `finplan-feature-implementation` ou de uma
  skill de backend, não desta.
