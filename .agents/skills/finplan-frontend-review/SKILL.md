---
name: finplan-frontend-review
description: >-
  Use when asked to review, audit or critique FinPlan's React/TypeScript
  frontend (apps/web): a component, a folder, a PR/branch diff or the whole
  web app. Also triggers on "revisar frontend", "code review do React",
  "auditar UI". Read-only by default: reports categorized findings with
  severity and file:line. Not for implementing changes
  (finplan-feature-implementation) nor for Go/SQL (finplan-backend-review).
---

# FinPlan — Revisão de Frontend

Revisão aprofundada e **somente leitura**: aponta problemas e sugere correções,
mas só edita código se o usuário pedir explicitamente ("revisa" ≠ "revisa e corrige").

## Procedimento

1. **Definir o alvo**
   - PR/branch: `git diff --stat main...HEAD -- apps/web` e depois `git diff main...HEAD -- apps/web`.
   - Componente/pasta: o caminho pedido.
   - "Front inteiro": `apps/web/src/`.
2. **Coletar o que é mecânico** (para não repetir no relatório):
   ```bash
   cd apps/web && npm run lint 2>&1 | tail -40 && npm test 2>&1 | tail -20
   ```
   Lint ou teste falhando entra como um único item; não liste o que o ESLint já aponta.
3. **Carregar o padrão de referência**: `apps/web/AGENTS.md`, ADR-0003 (UI
   otimista), ADR-0007 (agregados no servidor) e `docs/API.md` (tipos).
4. **Analisar** contra as 6 dimensões de [references/checklist.md](references/checklist.md), na ordem.
5. **Reportar** no formato abaixo.

## Formato do relatório

Cada achado:

```
[SEVERIDADE] caminho/arquivo.tsx:linha — título curto
  Por quê: explicação técnica objetiva (1–3 frases)
  Sugestão: o que fazer
```

- `CRÍTICO`: comportamento incorreto, perda de dado ou quebra em produção.
- `IMPORTANTE`: viola ADR/regra documentada, risco real de regressão ou dívida técnica relevante.
- `MENOR`: consistência ou nit, sempre ligado a uma regra existente.

Agrupe por **dimensão**, não por arquivo (ex.: "todas as mutations de goals
estão sem rollback otimista"). Termine com:
- contagem por severidade;
- **qualquer `CRÍTICO` ⇒ recomendação explícita de não mergear nem deployar**;
- até 3 próximos passos priorizados.

## Restrições

- Crítica de estilo só vale se apontar para regra em `apps/web/AGENTS.md`,
  num ADR ou em prática consolidada de React/TS. Preferência pessoal fica de fora.
- Problema de contrato de API ou de query SQL é escopo de `finplan-backend-review`.
- Para revisar web e api juntos, rode esta skill e `finplan-backend-review` em
  subagentes paralelos e consolide os resultados.
