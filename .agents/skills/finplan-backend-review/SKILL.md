---
name: finplan-backend-review
description: >-
  Use when asked to review, audit or critique FinPlan's Go/PostgreSQL backend
  (apps/api): a handler, a package, a PR/branch diff or the whole API. Also
  triggers on "revisar backend", "code review da API", "auditar Go". Read-only
  by default: reports categorized findings with severity and file:line. Not
  for implementing changes (finplan-feature-implementation) nor for frontend
  (finplan-frontend-review).
---

# FinPlan — Revisão de Backend

Revisão aprofundada e **somente leitura**: aponta problemas e sugere correções,
mas só edita código se o usuário pedir explicitamente ("revisa" ≠ "revisa e corrige").

## Procedimento

1. **Definir o alvo**
   - PR/branch: `git diff --stat main...HEAD -- apps/api` e depois `git diff main...HEAD -- apps/api`.
   - Pacote/arquivo: o caminho pedido.
   - "API inteira": todos os pacotes de `apps/api/internal/`.
2. **Coletar o que é mecânico** (para não repetir no relatório):
   ```bash
   cd apps/api && go vet ./... && go test ./... 2>&1 | tail -30
   ```
   Falha de teste ou de vet entra no relatório como um único item, sem detalhar
   cada aviso do vet.
3. **Carregar o padrão de referência**: `apps/api/AGENTS.md`, os ADRs citados
   lá e `docs/API.md` (para comparar o contrato).
4. **Analisar** contra as 6 dimensões de [references/checklist.md](references/checklist.md), na ordem.
5. **Reportar** no formato abaixo.

## Formato do relatório

Cada achado:

```
[SEVERIDADE] caminho/arquivo.go:linha — título curto
  Por quê: explicação técnica objetiva (1–3 frases)
  Sugestão: o que fazer
```

- `CRÍTICO`: corrompe dado, vaza segredo, quebra em produção ou permite acesso indevido.
- `IMPORTANTE`: viola ADR/regra documentada, risco real de regressão ou dívida técnica relevante.
- `MENOR`: consistência ou nit, sempre ligado a uma regra existente.

Agrupe por **dimensão**, não por arquivo, para que padrões sistêmicos fiquem
visíveis (ex.: "nenhum repository usa transação"). Termine com:
- contagem por severidade;
- **qualquer `CRÍTICO` ⇒ recomendação explícita de não mergear nem deployar**;
- até 3 próximos passos priorizados.

## Restrições

- Crítica de estilo só vale se apontar para regra em `apps/api/AGENTS.md`, num
  ADR ou em Go idiomático consolidado (Effective Go). Preferência pessoal fica de fora.
- Problema de consumo da API no React é escopo de `finplan-frontend-review`.
- Para revisar web e api juntos, rode esta skill e `finplan-frontend-review` em
  subagentes paralelos e consolide os resultados.
