# ADR-0008: Semântica de Atualização Parcial Estrita (PATCH Dinâmico com Ponteiros em Go)

- **Status**: Aceito
- **Data**: 2026-09-26
- **Decisores**: Equipe FinPlan

---

## 1. Contexto

A especificação da API do FinPlan prevê atualizações granulares de entidades via método HTTP `PATCH`.

Um exemplo crítico é a entidade `entry`:
- O usuário pode editar o valor orçado: `{ "plannedAmount": 1500.00 }`.
- Semanas depois, confirma o pagamento realizado: `{ "actualAmount": 1480.00, "paidDate": "2026-05-10" }`.
- Mais tarde, pode precisar desconfirmar o lançamento: `{ "actualAmount": null, "paidDate": null }`.

Se o backend tratasse essas requisições desserializando o JSON em structs Go convencionais baseadas em valores primitivos (`float64`, `string`):
1. **Problema do Zero-Value**: Campos omitidos no payload JSON seriam interpretados pelo Go como seus valores padrão (`0.0` ou `""`), sendo impossível distinguir entre "o cliente omitiu o campo porque não deseja alterá-lo" e "o cliente enviou intencionalmente zero".
2. **Sobrescrita Acidental**: Um `UPDATE entry SET planned_amount = $1, actual_amount = $2, paid_date = $3` genérico destruiria o `plannedAmount` preexistente toda vez que o usuário confirmasse apenas o `actualAmount`.

---

## 2. Decisão

Decidiu-se que **todos os endpoints `PATCH` do backend Go adotarão semântica de atualização parcial estrita**:

1. **Uso Obrigatório de Ponteiros nos Structs de Request**:
   - Cada campo opcional de um request `PATCH` é tipado como ponteiro (`*float64`, `*string`, `*int`):
     ```go
     type PatchEntryRequest struct {
         PlannedAmount *float64 `json:"plannedAmount,omitempty"`
         ActualAmount  *float64 `json:"actualAmount,omitempty"`
         PaidDate      *string  `json:"paidDate,omitempty"`
     }
     ```
   - Campo omitido no JSON → Ponteiro `nil` (não alterar no banco).
   - Campo enviado no JSON com valor → Ponteiro apontando para o valor.
   - Campo enviado explicitamente como `null` → Ponteiro manipulado de forma a gravar `NULL` no PostgreSQL (quando permitido pela coluna).
2. **Construção Dinâmica da Query SQL com Parâmetros**:
   - O repositório avalia os ponteiros não nulos e monta dinamicamente a cláusula `UPDATE ... SET` contendo unicamente as colunas presentes na requisição, utilizando placeholders parametrizados sequenciais (`$1, $2, ...`):
     ```go
     setParts := []string{}
     args := []interface{}{}
     // ... adiciona apenas campos não nil
     ```
3. **Payload Mínimo no Frontend**:
   - O cliente HTTP no React envia exclusivamente as propriedades que foram modificadas pela ação do usuário, sem serializar o objeto completo.

---

## 3. Consequências

### 3.1. Positivas
- **Imunidade contra Sobrescrita Acidental**: Atualizar o realizado nunca afeta o planejado, e vice-versa.
- **Eficiência de Rede**: Trafegam-se exclusivamente os deltas modificados.
- **Conformidade com a RFC 5789**: Cumpre rigorosamente a semântica de mutação parcial do protocolo HTTP.

### 3.2. Negativas e Trade-offs
- **Código de Repositório Mais Verboso**: Cada repositório em Go precisa inspecionar individualmente os ponteiros e montar dinamicamente os fragmentos SQL e a lista de argumentos `args`.

---

## 4. Referências

- [`docs/API.md`](../API.md#patch-apiv1entriesid)
- [`apps/api/internal/entry/repository.go`](../../apps/api/internal/entry/repository.go)
- [`apps/api/internal/costitem/repository.go`](../../apps/api/internal/costitem/repository.go)
- [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md)

