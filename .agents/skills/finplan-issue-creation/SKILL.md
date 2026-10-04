---
name: finplan-issue-creation
description: >-
  Use when asked to open, write, draft or refine a GitHub issue for the FinPlan
  repository (gildo-cordeiro/fin-plan): features, bugs, refactors or tech
  debt. Also triggers on "criar issue", "abrir issue", "escrever issue",
  "reportar bug". Produces an implementation-ready issue from
  templates/issue-template.md, grounded in the real code and docs, and creates
  it through the GitHub MCP after user confirmation. Not for implementing the
  issue (use finplan-feature-implementation).
---

# FinPlan — Issue Creation Skill

## Objetivo

Transformar um pedido curto ("cria uma issue pra X") em uma issue detalhada e
pronta para implementação, seguindo `templates/issue-template.md`. A issue
deve ser útil para quem for implementá-la sem precisar de contexto extra —
incluindo o próprio agente, que vai lê-la depois junto com a skill
`finplan-feature-implementation`.

## Pré-requisito

O MCP do GitHub precisa estar conectado, com token com permissão de leitura e
escrita em **Issues** no repositório `gildo-cordeiro/fin-plan`. Se a
ferramenta de criação de issue não estiver disponível, entregar o corpo da
issue pronto para colar manualmente e avisar o motivo.

## Fluxo

1. **Entender o pedido**
   Classificar em um tipo: `feature`, `bug`, `refactor` ou `tech-debt`. Se o
   pedido for ambíguo entre dois tipos, escolher o mais provável e declarar a
   escolha ao usuário no resumo final — não bloquear com pergunta.

2. **Ler o contexto real antes de escrever**
   - `docs/ARCHITECTURE.md`, `docs/API.md` e os ADRs relevantes em `docs/adrs/`.
   - O código citado ou relacionado ao pedido (`apps/api/internal/` e
     `apps/web/src/`). Toda referência a arquivo, endpoint, tabela ou componente na
     issue deve existir de fato; confira antes de citar.
   - Para bug: tente localizar o ponto provável da falha e cite-o como
     hipótese, marcado como hipótese.

3. **Checar duplicidade**
   Busque issues abertas e recentes com termos parecidos (MCP do GitHub:
   `search_issues` com `repo:gildo-cordeiro/fin-plan is:issue <termos>`).
   Se existir issue equivalente, não crie outra: informe o usuário e
   proponha comentar ou complementar a existente.

4. **Descobrir a convenção do repositório**
   Liste as issues recentes (`list_issues`, `state: all`, ordenadas por data)
   para copiar o padrão de título e os labels em uso. Não invente labels:
   use só os existentes e cite no resumo qualquer label que faria sentido mas não existe.

5. **Preencher o template**
   Usar `templates/issue-template.md`. Regras de preenchimento:
   - Remover por completo as seções que não se aplicam ao tipo (ex:
     "Passos para reproduzir" só existe em `bug`).
   - Nunca deixar placeholder (`<...>`, `TODO`, `TBD`) no texto final. Se a
     informação não existe, escrever "Não definido" em "Dúvidas em aberto",
     em vez de inventar.
   - Critérios de aceite devem ser verificáveis por alguém que não escreveu a
     issue (observáveis: comportamento, resposta de API, valor na tela).
   - Em "Áreas impactadas", marcar somente o que o código confirma que será
     tocado.
   - Quando houver mudança de schema, contrato de API ou de UI, listar
     explicitamente cada arquivo de documentação que precisa ser atualizado.

6. **Confirmar com o usuário antes de criar**
   Criar issue é uma ação visível e externa. Mostrar título, labels e corpo
   completo e pedir confirmação. Só criar após um "sim" explícito, a menos que
   o usuário já tenha dito na mesma mensagem para criar direto.

7. **Criar e reportar**
   Criar via MCP do GitHub (`create_issue`). Ao final, devolver o link da issue criada, o tipo
   escolhido e uma linha para cada decisão tomada por conta própria (tipo,
   labels, itens deixados em "Dúvidas em aberto").

## Título

- Curto, no imperativo ou descritivo, sem ponto final, com no máximo ~70
  caracteres.
- Seguir o padrão observado nas issues recentes do repositório (passo 4). Se
  não houver padrão claro, usar Conventional Commits, alinhado com
  `AGENTS.md` da raiz: `feat(api): ...`, `fix(web): ...`,
  `refactor(api): ...`.

## Divisão de issues grandes

Se o pedido for grande demais para uma única entrega (toca backend, migration
e frontend de forma independente), propor uma issue-mãe com checklist de
sub-issues e criar cada sub-issue com este mesmo template, ligando-as pelo
número. Confirmar a divisão com o usuário antes de criar qualquer uma.

## Restrições

- Não inventar comportamento atual: descrever apenas o que foi confirmado no
  código ou informado pelo usuário.
- Não incluir código de implementação completo na issue; trechos curtos só
  quando esclarecem um contrato (ex: formato de payload).
- Não atribuir pessoas, milestones ou projetos sem o usuário pedir.
- Não fechar, editar ou comentar em issues existentes sem pedido explícito.
- Não criar mais de uma issue por pedido, exceto no caso de divisão aprovada.
- Escrever a issue em português, mantendo termos técnicos e nomes de código
  no original.
