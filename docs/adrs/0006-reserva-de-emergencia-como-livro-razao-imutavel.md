# ADR-0006: Reserva de Emergência como Livro-Razão Imutável (`reserve_movement`)

- **Status**: Aceito
- **Data**: 2026-09-24
- **Decisores**: Equipe FinPlan

---

## 1. Contexto

A Reserva de Emergência representa a salvaguarda financeira mais crítica de um indivíduo. Em versões prévias, cogitou-se fornecer um CRUD convencional (com operações de `PATCH` e `DELETE`) para movimentações de reserva.

No entanto, essa abordagem feria princípios contábeis básicos:
1. **Destruição de Trilha de Auditoria**: Permitir editar ou deletar um aporte ou resgate realizado no passado mascarava decisões orçamentárias tomadas meses atrás.
2. **Inconsistência de Reconciliação**: Caso um valor fosse retificado silenciosamente, relatórios de fluxo de caixa passados passavam a divergir dos extratos bancários reais sem qualquer justificativa registrada.
3. **Risco de Ações Destrutivas Acidentais**: Exclusões não intencionais desestabilizavam a meta de reserva definida para o ano.

---

## 2. Decisão

Decidiu-se modelar as movimentações da reserva de emergência (**`reserve_movement`**) estritamente como um **Livro-Razão Imutável (*Append-Only Ledger*)**:

1. **Schema Imutável**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `budget_id TEXT NOT NULL REFERENCES budget(id) ON DELETE CASCADE`
   - `month INT NOT NULL CHECK (month BETWEEN 1 AND 12)`
   - `amount NUMERIC(12,2) NOT NULL` (valores positivos representam aportes; valores negativos representam resgates/retiradas)
   - `reason TEXT`: Motivação obrigatória ou descritiva do movimento.
2. **Restrição Estrita de Verbos HTTP na API**:
   - A API expõe **apenas**:
     - `POST /api/v1/reserve-movements` (Registro de novo movimento)
     - `GET /api/v1/budgets/{year}/reserve-movements` (Histórico cronológico de movimentações)
   - **NÃO existem e NUNCA serão implementadas rotas `PATCH` ou `DELETE` para `reserve_movement`**.
3. **Mecanismo de Retificação por Compensação**:
   - Se um lançamento for inserido com valor incorreto (ex: aporte de R\$ 1.000,00 quando deveria ser R\$ 100,00), a correção exige o registro de uma nova movimentação compensatória de estorno de sinal oposto (ex: -R\$ 900,00 com motivo: *"Estorno de valor lançado a maior"*).

---

## 3. Consequências

### 3.1. Positivas
- **Integridade Histórica e Rastreabilidade**: Cada centavo que entra ou sai da reserva mantém histórico perene com carimbo de tempo e motivo.
- **Conformidade Contábil**: Adota o princípio de partidas e lançamentos compensatórios utilizado pelo sistema bancário real.
- **Proteção contra Regressões em PRs**: A documentação explícita desta decisão evita que futuros mantenedores implementem acidentalmente rotas de deleção ou edição para a reserva.

### 3.2. Negativas e Trade-offs
- **Curva de Uso na Interface**: Usuários acostumados a "apagar um erro" precisam compreender que a correção é feita registrando uma movimentação inversa. A UI deve orientar essa ação com mensagens claras.

---

## 4. Referências

- [`docs/API.md`](../API.md#6-movimentações-da-reserva-reserve_movement)
- [`apps/api/internal/reserve/handler.go`](../../apps/api/internal/reserve/handler.go)
- [`apps/api/internal/reserve/service.go`](../../apps/api/internal/reserve/service.go)
- [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md#35-reserva-de-emergência-como-livro-razão-imutável-reserve_movement)
