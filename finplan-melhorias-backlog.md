# FinPlan — Backlog de Melhorias

Análise baseada na gravação de tela do app (`fin-plan-phi.vercel.app`) e no documento `ARQUITETURA_E_FUNCIONAMENTO.md`. Organizado por prioridade para facilitar a criação de issues no repositório.

---

## 🔴 P0 — Bugs críticos

### 1. Aviso incorreto no Simulador de Cenários
**Onde:** Aba "Simulações"
**Problema:** Com os sliders em 0% (sem simulação ativa) e "Saldo Acumulado no Final" positivo (R$ 44.176,59), o painel ainda exibe o aviso *"Você consegue cobrir os gastos, mas terá que usar parte da sua Reserva de Emergência. Menor saldo previsto: R$ 1.324,42"*. O valor de "menor saldo previsto" coincide exatamente com o saldo acumulado do primeiro mês (Out/26), sugerindo que a lógica está pegando o saldo errado da série (primeiro mês em vez do mínimo real) e/ou comparando incorretamente contra a meta de reserva.
**Ação:** Revisar a função que gera esse aviso (provavelmente em `budgetCalculator.ts` ou no componente da aba Simulações). Adicionar teste unitário cobrindo "sem simulação ativa + saldo final positivo ⇒ sem aviso de uso de reserva".

### 2. Possível achatamento incorreto da curva de projeção
**Onde:** Aba "12 Meses & Gráficos"
**Problema:** A curva "Trajetória do Saldo Acumulado" está quase perfeitamente linear ao longo dos 12 meses, mesmo havendo custos pontuais concentrados em Dezembro/26 (mudança de residência) e faturas de cartão variáveis. O esperado seria pelo menos uma inflexão visível em Dez/26.
**Ação:** Confirmar se a projeção usa os valores reais por mês (`MonthItem.values`) ou está replicando a sobra média do mês atual para os 12 meses. Se for o segundo caso, é um bug de cálculo que compromete a confiabilidade da projeção.

---

## 🟠 P1 — Segurança e integridade de dados

### 3. Endpoint `/api/budget` sem autenticação aparente
**Problema:** O documento de arquitetura não menciona nenhuma camada de auth para o endpoint serverless. Como o modelo é um único documento global (`default_budget`) no MongoDB Atlas, qualquer pessoa que descubra a URL pública pode potencialmente ler/escrever o orçamento.
**Ação:** Adicionar no mínimo uma chave compartilhada (header secreto) ou allow-list de IP/origem no endpoint. Avaliar autenticação leve (ex: senha única salva em variável de ambiente + cookie de sessão) já que é um app pessoal.

### 4. Persistência direta no banco para toda edição e inserção
**Problema:** O modelo híbrido anterior (localStorage prioritário + debounce longo + botão manual) causava ambiguidades e dados desatualizados ao abrir em outro dispositivo.
**Ação:** Remover a camada de sincronização híbrida. O app deve carregar sempre direto do banco de dados (MongoDB Atlas) ao inicializar e salvar diretamente no banco a cada alteração (edição, inserção, exclusão), com debounce curto (500ms) para digitação numérica.

### 5. Indicador direto de persistência no banco
**Problema:** Botão manual de "Salvar na Nuvem" e ausência de feedback direto do status do banco.
**Ação:** Remover botões manuais de sync. Implementar indicador direto no topo da tela (*Carregando do banco...*, *Salvando...*, *Salvo no banco às HH:MM*, ou alerta caso haja falha de conexão).

---

## 🟡 P2 — UX / UI por tela

### Mês Atual
- **Formatação de moeda inconsistente**: cards mostram `R$ 8.166,00`, mas os inputs abaixo mostram valores crus (`1155.73`, `3156.58`, ponto em vez de vírgula). Unificar com um único componente `CurrencyInput` (já existe em `ui/`) aplicando máscara pt-BR em todos os campos.
- **Navegação duplicada para visão multi-mês**: a aba "12 Meses & Gráficos" convive com o botão "Planilha Multi-Meses" (dentro do seletor de mês) e com atalhos redundantes no rodapé da página ("Gráficos Rápidos", "12 Meses", "Simulador Rápido", "Simulações"), que repetem as mesmas 4 abas do topo. Consolidar em uma única navegação por abas (fixa ao rolar) e remover os atalhos do rodapé.
- **Página muito longa por padrão**: seções Rendas/Cartões/Fixas/Variáveis vêm todas expandidas com todos os itens editáveis. Trocar para accordion fechado por padrão, abrindo só a seção que o usuário quer editar.

### 12 Meses & Gráficos
- Muitos controles de intervalo lado a lado (3/6/12/24 meses, +Mês, -Mês, Personalizar). Consolidar em um controle segmentado + um botão único "Personalizar intervalo" com date-range picker.
- Botão "Baixar planilha (CSV)" fica espremido no canto inferior direito, quase cortado da viewport. Dar mais destaque (subir para o cabeçalho da seção "Resumo mês a mês") e avaliar oferecer exportação também em XLSX.

### Metas & Reserva
- **Barras de progresso em 0%** ficam visualmente "vazias" — parecem elemento quebrado. Adicionar um traço mínimo sempre visível para deixar claro que é uma barra de progresso zerada, não um erro.
- **Ambiguidade no agendamento de custos pontuais**: existe um seletor "global" no topo ("Agendar para Dezembro 2026") e cada item da lista também tem seu próprio dropdown "Pagar em Dez/26". Não fica claro se o seletor global aplica a todos, é só um resumo, ou define o padrão para novos itens. Rotular explicitamente (ex: "Mês padrão para novos custos") ou adicionar um botão "Aplicar a todos os itens".

### Simulações
- Os campos "Saldo disponível hoje" e "Reserva que não quer tocar" duplicam dados já existentes em outras telas (saldo do topo e meta da Reserva de Emergência), sem sincronização visível — risco de divergência silenciosa. Pré-preencher a partir da fonte única de verdade e deixar claro quando o usuário está sobrescrevendo apenas para fins de simulação.

---

## 🟢 P3 — Melhorias técnicas de base

### 6. Testes E2E / de componente
**Problema:** A suíte Vitest cobre bem `budgetCalculator`, `budgetApiService`, `storageService` e `idGenerator`, mas não há testes de UI/E2E. Como boa parte da lógica financeira é exposta diretamente na UI (inputs inline, sliders de simulação), um teste E2E teria pego o bug do item 1 antes de ir para produção.
**Ação:** Adicionar Playwright (ou similar) cobrindo o fluxo: editar valores → ver saldo recalculado → rodar simulação → validar avisos.

### 7. Acessibilidade
**Problema:** Vários status são comunicados só por cor (badge verde "Orçamento no azul", ícones sem texto alternativo aparente).
**Ação:** Revisar contraste de cores e adicionar `aria-label`s / texto alternativo nos indicadores de status.

### 8. Camada de formatação centralizada
**Problema:** Mistura de formatos numéricos (`1155.73` no input vs `R$ 1.155,73` no card) indica que a formatação não está centralizada.
**Ação:** Garantir que todo componente (inputs e displays) use o `formatters.ts` já existente, incluindo máscara de entrada.

---

## Resumo por prioridade

| Prioridade | Itens |
|---|---|
| P0 — Bugs críticos | 2 |
| P1 — Segurança e integridade | 3 |
| P2 — UX/UI por tela | 4 (com múltiplos pontos cada) |
| P3 — Base técnica | 3 |
