---
name: finplan-pr-workflow
description: >-
  Use when work in the FinPlan repo needs to be versioned and delivered:
  creating a branch, writing commits, pushing and opening a Pull Request
  linked to an issue. Also triggers on "abrir PR", "criar branch", "commitar",
  "subir as alterações". Usually invoked at the start (branch) and end (PR) of
  finplan-feature-implementation.
---

# FinPlan — Branch, Commit e Pull Request

Convenções de nome e de commit estão no `AGENTS.md` da raiz. Esta skill é o procedimento.

## 1. Branch (no início da tarefa)

**REGRA DE OURO:** NUNCA crie uma branch a partir da branch atual se ela não for a `main`. SEMPRE atualize a `main` primeiro.

```bash
git fetch origin
git checkout main
git pull origin main
git status --short                 # working tree precisa estar limpa ou ser da própria tarefa
git switch -c <tipo>/<descricao-curta>
```

- `<tipo>` acompanha o tipo da issue: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`.
- Se houver issue, inclua o número: `feat/42-categoria-metas`.
- Se já estiver numa branch da tarefa, não crie outra.

## 2. Commits

- Commits pequenos e coesos; um assunto por commit.
- Adicione só os arquivos da tarefa (`git add <arquivos>`); nunca `git add -A`
  sem conferir o `git status`. Nunca commite `.env`.
- Mensagem: `<tipo>(<escopo>): <descrição no imperativo>`. Escopos usuais:
  `api`, `web`, `goals`, `budget`, `costs`, `reserve`, `simulation`, `docs`, `ci`.
- Corpo opcional explicando o **porquê** quando não for óbvio.

## 3. Validar antes de subir

```bash
.agents/skills/finplan-feature-implementation/scripts/validate.sh
```

Não suba nada com a validação falhando.

## 4. Push e PR (ação externa: confirmar com o usuário)

Mostre ao usuário a branch, a lista de commits (`git log --oneline origin/main..HEAD`),
o título e o corpo do PR, e só continue com um "sim" explícito, a menos que ele
já tenha pedido na mesma mensagem para abrir o PR direto.

```bash
git push -u origin HEAD
```

Abra o PR contra `main` no repositório `gildo-cordeiro/fin-plan`:
- **Preferencial:** MCP do GitHub, ferramenta `create_pull_request` (`owner`,
  `repo`, `head` = branch, `base` = `main`, `title`, `body`).
- **Alternativa:** `gh pr create --base main --title "..." --body-file <arquivo>`.
- Sem nenhum dos dois: entregue o link
  `https://github.com/gildo-cordeiro/fin-plan/compare/main...<branch>` e o corpo pronto para colar.

**Título:** igual ao commit principal (`feat(goals): adicionar categoria às metas`).

**Corpo:**

```markdown
## Resumo
O que muda e por quê (1–3 frases).

## Mudanças
- api: ...
- web: ...
- docs: ...

## Como testar
1. ...

## Validação
- [x] validate.sh passou (web: lint/test/build · api: vet/test/build)
- [ ] docs/API.md / docs/ARCHITECTURE.md atualizados (se aplicável)

Closes #<issue>
```

## 5. Reportar

Devolva o link do PR, a branch e a lista de commits. Se não houver issue
vinculada, avise e sugira criar uma com `finplan-issue-creation`.
