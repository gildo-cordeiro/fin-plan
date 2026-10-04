# ADR 0011: Migração de Estado para TanStack Query e Zustand

**Status**: Aceito
**Data**: 2026-10-04

## Contexto

Anteriormente, o estado do frontend era gerenciado por um grande `BudgetContext` nativo do React (conforme ADR-0003). Isso centralizava a lógica, mas causava re-renders em cascata e misturava o estado do servidor (dados financeiros persistidos) com o estado local (preferências de usuário, configurações de simulação). Com o crescimento do modelo de domínio rico e endpoints separados para cada contexto (metas, despesas pontuais, reserva), o Context nativo do React tornou-se ineficiente e propenso a falhas de sincronização se não gerenciado manualmente com extrema cautela.

## Decisão

Foi decidido substituir o uso do `BudgetContext` nativo pelas seguintes bibliotecas especializadas:

1.  **TanStack Query (React Query)**: Passa a ser a única fonte da verdade para dados provenientes do servidor.
    *   Arquivos de hooks isolados em `src/queries/` (`budget.ts`, `costs.ts`, `goals.ts`) com query keys centralizadas.
    *   Lida com data fetching, stale-while-revalidate, cache e deduplicação de chamadas.
    *   Lógica de "optimistic update" implementada nos hooks (`onMutate` guarda o estado prévio em `snapshot` e dá update síncrono com `setQueryData`; `onError` realiza o rollback; e `onSettled` força a revalidação com `invalidateQueries`).
2.  **Zustand**: Passa a gerenciar exclusivamente o estado puramente local e síncrono.
    *   Centralizado em `src/store/useBudgetStore.ts`.
    *   Responsável apenas por estado local não-persistido no servidor: tema (`light`/`dark`), ano corrente selecionado na view e parâmetros de simulação financeira.

O `BudgetContext` original foi removido, sendo preservado apenas o padrão de Context API simples para features muito locais e leves, como o `ToastContext` para notificações globais na UI.

## Consequências

-   **Positivas**:
    -   Separação clara entre *Server State* e *Client State*.
    -   Melhora significativa de performance, reduzindo re-renders em cascata (os componentes assinam seletivamente os dados de que precisam).
    -   Simplificação da injeção e consumo de dados nos componentes de UI, que assinam diretamente aos hooks específicos do seu domínio (ex: `useGoalsQuery()`).
-   **Negativas**:
    -   Maior verbosidade ao definir chaves (Query Keys) únicas e mapeamento das dependências para invalidação correta.
    -   Curva de aprendizado inicial maior para o uso da lib.

A decisão complementar documentada no ADR-0003 em relação à UI Otimista continua em vigor; a diferença é estritamente o meio de implementação (de hooks costurados artesanalmente no React Context para utilitários padronizados do `useMutation` do TanStack Query).
