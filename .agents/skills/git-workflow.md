# 🌿 Skill: Git Workflow & Práticas de Versionamento no FinPlan

Esta skill define as convenções de git, branches, commits e fluxo de aprovação para o repositório **FinPlan**.

---

## 1. Padrão de Branches

O desenvolvimento é baseado em branches curtas criadas a partir de `main` e integradas via Pull Request.

### Nomenclatura Padrão:
- **Novas Funcionalidades**: `feat/<modulo-ou-fase>-<descricao-curta>`
- **Correções de Bugs**: `fix/<descricao-do-problema>`
- **Testes e Qualidade**: `test/<suite-ou-cenario>`
- **Documentação e Guias**: `docs/<tema-da-doc>`
- **Refatorações Estruturais**: `refactor/<escopo>`

### Exemplos Reais do Histórico do Repositório:
- `feat/fase-1-bugs-criticos-p0`
- `feat/fase-2-persistencia-direta-p1`
- `feat/fase-3-refinamento-ux-ui-p2`
- `feat/fase-4-base-tecnica-qualidade-p3`

---

## 2. Padrão de Commits (Conventional Commits)

As mensagens de commit devem seguir o padrão Conventional Commits com escopos claros e verbos no infinitivo ou presente.

### Estrutura:
```text
<tipo>(<escopo>): <descrição sucinta em português ou inglês>
```

### Tipos Permitidos:
| Tipo | Quando Usar |
|---|---|
| `feat` | Implementação de nova funcionalidade ou expansão de tela/modelo. |
| `fix` | Correção de bug em cálculos, interface ou endpoint. |
| `test` | Adição ou alteração de testes unitários (`vitest`) ou E2E (`playwright`). |
| `docs` | Alterações puras em documentação (`README.md`, `docs/`, `.agents/skills/`). |
| `refactor` | Mudança de código que não altera comportamento funcional nem corrige bug. |
| `perf` | Otimização de performance (ex: renderizações, debounce, bundling). |
| `chore` | Manutenção de dependências, configs de build ou gitignore. |

### Exemplos Reais Extraídos do Git Log do Projeto:
- `feat(sync): persistência direta no MongoDB Atlas e proteção por API Key (P1)`
- `fix(simulation-charts): corrigir alerta indevido no simulador e incluir custos pontuais nos gráficos`
- `feat(ui): refinamentos de UX/UI por tela, formatação pt-BR e navegação consolidada (P2)`
- `test(e2e): suite Playwright, testes unitários de simulação/API e melhorias de acessibilidade (P3)`
- `fix(api): consolidate api/budget into self-contained serverless function with safe response helper`
- `fix(dev): use server.ssrLoadModule for /api/budget middleware in Vite dev server`

---

## 3. Checklist Obrigatório Pré-Commit / Pré-PR

Antes de submeter qualquer alteração para a branch `main`, é obrigatório rodar localmente e garantir aprovação integral dos três comandos:

```bash
# 1. Testes unitários e de integração (37 testes obrigatórios)
npm test

# 2. Typecheck estrito do TypeScript e empacotamento de produção
npm run build

# 3. Testes ponta a ponta herméticos (Playwright)
npm run test:e2e
```

### Regras Adicionais de Segurança:
- Nunca commite o arquivo `.env` com dados de produção ou credenciais do MongoDB Atlas. Verifique o `.gitignore`.
- Se novas variáveis de ambiente forem criadas, documente-as imediatamente em `.env.example`.
- Mantenha `package.json` e `package-lock.json` rigorosamente sincronizados.
