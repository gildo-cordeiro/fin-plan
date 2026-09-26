# 🎨 Skill: Frontend Patterns & Design System no FinPlan

Esta skill descreve as convenções visuais, padrões de componentes e arquitetura de estado no frontend do **FinPlan**.

---

## 1. Design System & Identidade Visual

O FinPlan adota uma interface corporativa limpa, com foco em densidade de informação e legibilidade numérica para finanças:

- **Framework**: Tailwind CSS v3 com suporte completo a **Dark Mode** baseado na classe `.dark` em `document.documentElement`.
- **Paleta de Cores Principais**:
  - **Primária**: Azul petróleo `#0e6b7a` (ativos, destaques, botões selecionados) com contraste claro `#4ec2d3`.
  - **Sucesso / Entradas**: Esmeralda (`emerald-500`, `emerald-600`, `emerald-400`).
  - **Atenção / Reserva**: Âmbar (`amber-500`, `amber-600`, `amber-400`).
  - **Perigo / Déficit**: Rosa avermelhado / Carmin (`rose-600`, `rose-400`, `#c53030`).
  - **Fundos**: Claro `#f4f6f8`, Escuro `#0b1116`.
- **Tipografia Numérica Tabular**:
  - Sempre utilize `font-mono tabular-nums` para valores monetários, porcentagens e datas. Isso impede que os números "pulem" ou desalinhem colunas durante a digitação.

---

## 2. Padrões de Componentes de UI (`src/components/ui/`)

### 2.1. Input Monetário (`CurrencyInput.tsx`)
Todo campo de entrada de dinheiro deve utilizar [`CurrencyInput`](file:///home/gildo-duarte/Documentos/Projects/fin-plan/src/components/ui/CurrencyInput.tsx).
- Aceita digitação em formato brasileiro (`1.234,56` ou `1234,56`) e internacional (`1234.56`).
- Possui debounce interno (padrão 350ms) para não sobrecarregar o estado com re-renderizações a cada caractere.
- Formata no blur e limpa zeros para exibir placeholder quando vazio.

```tsx
// Exemplo de uso extraído de src/components/budget/MonthBudgetView.tsx:
<CurrencyInput
  value={item.values[monthId] ?? 0}
  onChange={(val) => updateItemValue(category, item.id, monthId, val)}
  className="w-28 sm:w-32 text-right"
  placeholder="0,00"
  ariaLabel={`Valor de ${item.name} em ${month.name}`}
/>
```

### 2.2. Seções Colapsáveis (`CollapsibleSection.tsx`)
Para listas de despesas ou blocos densos, utilize [`CollapsibleSection`](file:///home/gildo-duarte/Documentos/Projects/fin-plan/src/components/ui/CollapsibleSection.tsx) com acessibilidade nativa (`aria-expanded`, botões com `type="button"`):

```tsx
// Exemplo de uso extraído de src/components/budget/MonthBudgetView.tsx:
<CollapsibleSection
  title="Despesas Fixas"
  icon="🏠"
  total={formatBRL(rawFixed)}
  defaultOpen={false}
>
  {renderItems(state.lists.fixas, 'fixas', true)}
</CollapsibleSection>
```

---

## 3. Arquitetura de Estado e Motor Matemático Desacoplado

### 3.1. Separação Estrita de Cálculos
**Nunca execute somatórios complexos, amortizações ou multiplicadores de simulação diretamente dentro de componentes visuais.**
Toda a lógica matemática reside no motor puro [`budgetCalculator.ts`](file:///home/gildo-duarte/Documentos/Projects/fin-plan/src/services/budgetCalculator.ts):

```typescript
// Trecho real extraído de src/services/budgetCalculator.ts:
export function calculateMonthlySummaries(state: BudgetState): MonthSummary[] {
  const { months, simulation, incomes, lists, oneTimeCosts } = state;
  const { varsPercent, rendaPercent, oneTimeMarginPercent, initialBalance, emergencyReserve } = simulation;

  const incomeFactor = 1 + rendaPercent / 100;
  const varsFactor = 1 + varsPercent / 100;
  const oneTimeFactor = 1 + oneTimeMarginPercent / 100;

  // Realiza projeções puras sem efeitos colaterais
  // ...
  return summaries;
}
```

### 3.2. Consumo de Estado via Contexto (`useBudget`)
Os componentes consom os cálculos e despacham ações exclusivamente através de [`useBudget`](file:///home/gildo-duarte/Documentos/Projects/fin-plan/src/context/BudgetContext.tsx):

```tsx
const {
  state,
  monthlySummaries,
  metrics,
  updateItemValue,
  toggleItemActive,
} = useBudget();
```

### 3.3. Ciclo de Atualização e Debounce
- Ações mutam o estado imutável com `setState(prev => ({ ...prev }))`.
- O `BudgetContext` sincroniza síncronamente com `localStorage.setItem(StorageKey.AppData, ...)`.
- Um timer de debounce de **500ms** consolida alterações e despacha para a API em segundo plano:
```typescript
// Trecho real extraído de src/context/BudgetContext.tsx:
setIsSaving(true);
const timer = setTimeout(async () => {
  try {
    const res = await budgetApiService.saveBudget(latestStateRef.current);
    setLastSaved(res.updatedAt);
    setSaveError(null);
  } catch (err: unknown) {
    setSaveError(err instanceof Error ? err.message : 'Falha ao salvar no banco de dados');
  } finally {
    setIsSaving(false);
  }
}, 500);
```

---

## 4. Formatadores e Utilitários (`src/utils/formatters.ts`)

- **Valores em BRL**: Use sempre `formatBRL(value, includeSign?)`:
  - `formatBRL(1234.5)` → `"R$ 1.234,50"`
  - `formatBRL(-500)` → `"- R$ 500,00"`
- **Compacto para Gráficos**: Use `formatCompactBRL(value)`:
  - `formatCompactBRL(1500)` → `"1,5k"`
  - `formatCompactBRL(2000000)` → `"2,0M"`
- **Porcentagens**: Use `formatPercent(value)`:
  - `formatPercent(12.5)` → `"+12,5%"`
