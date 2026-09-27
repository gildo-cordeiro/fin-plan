# ADR-0003: Interface Reativa com Atualizações Otimistas e Rollback Automático

- **Status**: Aceito
- **Data**: 2026-09-21
- **Decisores**: Equipe FinPlan

---

## 1. Contexto

Historicamente, o FinPlan utilizava uma estratégia **Local-First**, persistindo a árvore completa de dados do orçamento no `localStorage` do navegador e executando um salvamento remoto assíncrono (com *debounce* de 500ms) contra a nuvem.

Embora proporcionasse uma interface extremamente responsiva, essa abordagem trazia problemas críticos:
1. **Divergência entre Dispositivos**: Acessar o sistema em múltiplos navegadores resultava em conflitos frequentes de sobrescrita, onde o `localStorage` defasado de uma aba sobrescrevia edições recentes feitas em outro dispositivo.
2. **Fragilidade de Armazenamento**: Limpezas de dados do navegador ou janelas anônimas podiam acarretar perda de dados não sincronizados.
3. **Complexidade de Sincronização Bidirecional**: Reconciliar coleções complexas no cliente exigiria motores de sincronização pesados (CRDTs ou merge triplo).

---

## 2. Decisão

Decidiu-se migrar para uma arquitetura **100% Server-First** com **Atualizações Otimistas (Optimistic UI)**:

1. **PostgreSQL como Única Fonte da Verdade**:
   - Dados financeiros (`budget`, `items`, `entries`, `costs`, `goals`, `reserveMovements`) são lidos e gravados diretamente no backend via API REST.
2. **Restrição Estrita do `localStorage` (Schema v5)**:
   - O `localStorage` armazena **exclusivamente**:
     - Preferências de interface: `theme` ('light' | 'dark') e `currentYear`.
     - Parâmetros efêmeros do simulador "E se...": `varsPercent`, `rendaPercent` e `oneTimeMarginPercent`.
   - Nenhuma entidade financeira é mantida em cache local.
3. **Padrão de Atualização Otimista com Rollback e Toast**:
   - Ao executar qualquer edição na interface (ex: digitar um valor planejado ou confirmar um pagamento), a modificação é aplicada no estado do React imediatamente no instante zero (**0ms de latência percebida**).
   - O snapshot do estado prévio é capturado antes da mutação.
   - A chamada HTTP atômica (`PATCH /api/v1/entries/{id}`, etc.) é disparada em background.
   - **Caso de Sucesso**: O estado em memória já reflete o dado correto; não há necessidade de recarregar a tela ou aguardar o servidor.
   - **Caso de Erro (Rede ou Validação)**: O rollback automático restaura o snapshot anterior e um aviso visual amigável é exibido ao usuário através do `ToastContext`.

---

## 3. Consequências

### 3.1. Positivas
- **Velocidade de Digitação Mantida**: O usuário continua experimentando uma aplicação ultrarrápida, sem travamento de tela ou spinners bloqueantes a cada tecla digitada.
- **Sincronismo Confiável entre Dispositivos**: Qualquer dispositivo que abrir o FinPlan obtém imediatamente o estado mais recente persistido no PostgreSQL.
- **Resiliência a Falhas**: Falhas transitórias de conexão são tratadas graciosamente com reversão de estado e feedback explícito via Toast.

### 3.2. Negativas e Trade-offs
- **Complexidade no Gerenciamento de Estado**: Cada ação no `BudgetContext` precisa encapsular ou consumir o utilitário de mutação otimista com função de rollback correspondente.
- **Dependência de Conexão Online**: Por não manter cópia completa dos dados em disco local, a leitura inicial do orçamento requer conexão ativa com a API.

---

## 4. Referências

- [`apps/web/src/context/BudgetContext.tsx`](../../apps/web/src/context/BudgetContext.tsx)
- [`apps/web/src/context/ToastContext.tsx`](../../apps/web/src/context/ToastContext.tsx)
- [`apps/web/src/services/storageService.ts`](../../apps/web/src/services/storageService.ts)
- [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md#31-persistência-100-backend-sem-cache-local-de-dados)
