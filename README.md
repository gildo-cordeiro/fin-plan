# 💸 FinPlan — Planejador Financeiro & Orçamento de Metas

Um aplicativo moderno, reativo e bem estruturado construído em **React 18 + TypeScript + Vite + Tailwind CSS**, desenvolvido para superar as limitações de horizontes rígidos (como os antigos 3 meses) e permitir planejar com flexibilidade qualquer período de tempo (**3 meses, 6 meses, 12 meses / 1 ano, 24 meses / 2 anos ou personalizado**).

---

## 🚀 Principais Funcionalidades

### 1. 📅 Horizonte Temporal Dinâmico e Ilimitado (Não se restringe a 3 meses)
- **Presets rápidos de horizonte**: alterne com 1 clique entre **3 Meses**, **6 Meses**, **12 Meses** e **24 Meses**.
- **Horizonte Personalizado**: escolha o mês e ano de início (ex: Outubro/2026) e projete quantos meses desejar (de 1 a 60 meses).
- **Adição/Remoção Fluida**: botões `+ Próximo Mês` e `- Mês Anterior` para expandir o fluxo mantendo os valores de despesas recorrentes preenchidos automaticamente.
- **Replicação inteligente**: botão `⇥` em cada linha para replicar o valor do 1º mês em todos os meses posteriores com 1 clique.

### 2. 📊 Dashboard Executivo & Gráficos Interativos
- **Cards de KPIs**:
  - **Sobra Líquida após Mudança / Metas**: badge dinâmico indicando se a meta é viável ou o valor exato faltante.
  - **Disponível para Metas**: saldo total acumulado menos a Reserva de Emergência intocável.
  - **Custo Total Planejado**: soma de custos pontuais com margem de segurança configurável.
  - **Ponto Crítico do Caixa (Break-even)**: alerta preventivo do menor saldo durante todo o período e taxa média de poupança.
- **Gráfico de Evolução do Saldo Acumulado (Cashflow SVG)**: curva com gradiente, linha de reserva intocável e tooltips interativos ao passar o mouse.
- **Gráfico Renda vs Despesas Mês a Mês (Stacked Bar Chart)**: comparativo visual de entradas versus composição de cartões, despesas fixas e variáveis.
- **Gráfico Donut de Distribuição de Gastos**: percentual de cada categoria no orçamento total.

### 3. 🔮 Simulador de Cenários ("E se...")
- Teste variações sem alterar seus dados base cadastrados:
  - **Gastos Variáveis**: simule oscilações de -50% a +50% (economia ou inflação).
  - **Renda Líquida**: simule aumento ou cortes de -30% a +30%.
  - **Margem de Imprevistos nos Custos Pontuais**: adicione de 0% a +50% de folga orçamentária.
  - **Saldo Inicial e Reserva de Emergência**: ajuste o ponto de partida e a blindagem financeira.

### 4. 📝 Planejamento Detalhado por Categorias
- **Rendas Líquidas**: suporte a múltiplas fontes de receita (salário, freelance, extras).
- **Cartões de Crédito**: acompanhamento de faturas e parcelas abertas por mês.
- **Despesas Fixas**: aluguel, condomínio, energia, gás, celular, internet, carro, etc.
- **Despesas Variáveis**: mercado, feira, galão de água, transporte, etc.
- **Custos Pontuais / Mudança**: caminhão/frete, caução/depósito, montagem de móveis, pintura e reformas, com atribuição de mês específico ou meta global.
- Checkboxes em cada item para ativar/desativar em simulações instantâneas.

### 5. 📋 Demonstrativo Mês a Mês & Exportação
- Tabela consolidada com Entradas, Cartões, Fixas, Variáveis, Custos Pontuais, Sobra do Mês e Saldo Acumulado.
- **Exportação para Planilha (CSV / Excel)** com codificação UTF-8 compatível.

### 6. ☁️ Banco de Dados em Nuvem (Google Sheets + SheetDB)
- **Integração nativa com Planilha Google**: seus dados ficam gravados diretamente em uma planilha relacional no seu Google Drive.
- **Identificadores Semânticos Determinísticos**: chaves puras (`cfg:*`, `renda:*`, `despesa:*`, `mudanca:*`, `meta:*`) que garantem idempotência e eliminam duplicatas.
- **Sincronização Granular (Delta Sync via `PATCH`)**: qualquer edição no app altera apenas a célula correspondente na planilha em ~300ms, sem adicionar novas linhas.
- **Modo Local-First**: o app funciona com latência zero e salva no `localStorage`, sincronizando em segundo plano com debounce de 2,5s.

### 7. 💾 Backup, Importação & Persistência Local
- Salvamento contínuo em tempo real no `localStorage` do navegador (v4).
- Modal dedicado para:
  - Copiar e colar JSON de configuração.
  - Baixar arquivo `.json`.
  - Carregar arquivo de backup `.json`.
  - Restaurar dados padrão iniciais.

### 8. 🌓 Design Moderno & Acessibilidade
- Modo Escuro (Dark Mode) e Modo Claro (Light Mode) com detecção automática e alternador no topo.
- Tipografia moderna (Inter + JetBrains Mono para números tabulares alinhados).
- Feedback tátil, inputs monetários com seleção rápida ao foco e layout responsivo (mobile, tablet e desktop).

---

## 📖 Documentação de Arquitetura

Para uma explicação detalhada de como o sistema foi concebido, seus fluxos de dados, a modelagem relacional na planilha e por que escolhemos IDs semânticos determinísticos em vez de UUIDs, leia o guia completo:

👉 **[docs/ARQUITETURA_E_FUNCIONAMENTO.md](docs/ARQUITETURA_E_FUNCIONAMENTO.md)**

---

## 🛠️ Como Executar o Projeto

### Pré-requisitos
Node.js instalado (v18 ou superior).

### Instalar dependências
```bash
npm install
```

### Iniciar o servidor de desenvolvimento
```bash
npm run dev
```
O servidor estará rodando em `http://localhost:5173`.

### Executar a Suíte de Testes Automatizados (Vitest)
```bash
npm test
```
Executa 23 testes unitários e de integração cobrindo o `sheetService`, normalização de slugs, gerador de IDs e fluxos de rede mockados.

### Compilar para Produção
```bash
npm run build
```
Os arquivos otimizados e minificados serão gerados na pasta `dist/`.

---

## 📁 Estrutura de Pastas

```
Finances/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── main.tsx                      # Ponto de entrada React 18
│   ├── App.tsx                       # Layout principal e rotas/abas
│   ├── index.css                     # Configurações do Tailwind e estilos base
│   ├── types/
│   │   └── budget.ts                 # Interfaces TypeScript do domínio financeiro
│   ├── constants/
│   │   └── seedData.ts               # Dados iniciais e valores de referência
│   ├── context/
│   │   └── BudgetContext.tsx         # Estado global, ações e persistência
│   ├── hooks/
│   │   └── useBudgetCalculations.ts  # Motor de cálculo e projeção financeira
│   ├── utils/
│   │   └── formatters.ts             # Formatadores BRL, números e datas
│   └── components/
│       ├── layout/
│       │   ├── Header.tsx            # Barra superior, tema e backup
│       │   └── NavigationTabs.tsx    # Abas de navegação (Dashboard, Detalhes, etc.)
│       ├── months/
│       │   └── MonthHorizonBar.tsx   # Barra de horizonte (Presets 3M, 6M, 12M, 24M)
│       ├── dashboard/
│       │   ├── KpiCards.tsx          # Indicadores principais de caixa e meta
│       │   ├── CashFlowChart.tsx     # Gráfico SVG de curva de caixa acumulado
│       │   ├── MonthlyBarChart.tsx   # Gráfico SVG de barras empilhadas
│       │   └── CategoryDonutChart.tsx# Gráfico SVG Donut de gastos por categoria
│       ├── simulation/
│       │   └── SimulationPanel.tsx   # Sliders de simulação ("E se...")
│       ├── budget/
│       │   ├── IncomeSection.tsx     # Seção de receitas
│       │   ├── CategorySection.tsx   # Componente reutilizável de despesas
│       │   └── OneTimeCostsSection.tsx # Custos da mudança / metas pontuais
│       ├── summary/
│       │   └── MonthlySummaryTable.tsx # Tabela consolidadora mês a mês + CSV
│       ├── modals/
│       │   └── BackupModal.tsx       # Importação e exportação de backups
│       └── ui/
│           ├── Button.tsx            # Botão reutilizável com variantes
│           ├── Card.tsx              # Card com suporte a glassmorphism
│           ├── Badge.tsx             # Pílulas e tags de status
│           └── CurrencyInput.tsx     # Input monetário formatado em BRL
```
