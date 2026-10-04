# FinPlan — Regras do Repositório

Planejador financeiro pessoal em monorepo com deploys desacoplados (ADR-0001).

| Caminho | Stack | Regras específicas |
|---|---|---|
| `apps/web/` | React + TypeScript + Vite, TanStack Query, Zustand, Tailwind, Radix | `apps/web/AGENTS.md` |
| `apps/api/` | Go (`net/http`), PostgreSQL via `pgx/v5`, migrações Goose | `apps/api/AGENTS.md` |
| `docs/` | `ARCHITECTURE.md`, `API.md`, `adrs/0001–0010` | — |

**Fonte da verdade:** decisões arquiteturais vivem em `docs/adrs/`. Antes de
contrariar algo, leia o ADR correspondente. Se a decisão mudar, crie um novo ADR
em vez de editar o antigo.

## Validação

Antes de dar qualquer tarefa de código como concluída, rode:

```bash
.agents/skills/finplan-feature-implementation/scripts/validate.sh
```

Ele espelha o CI (`.github/workflows/ci.yml`): `test`/`build` no web e
`vet`/`test`/`build` na api, apenas para os apps alterados. Também roda `lint`
no web como aviso (há erros antigos); não introduza erros de lint novos. Não
existe `package.json` na raiz nem testes E2E.

## Manutenção Viva e Documentação

Sempre que uma implementação alterar a arquitetura, as tecnologias ou o comportamento do sistema, você deve **auto-atualizar** o repositório na mesma entrega:
1. **Documentação**: Atualize `README.md`, `docs/ARCHITECTURE.md` e `docs/openapi.yaml` para refletir a nova realidade.
2. **Conhecimento do Agente**: Modifique os arquivos `AGENTS.md` e os arquivos em `.agents/skills/` se a sua alteração invalidar alguma instrução anterior.
3. **ADRs (Registros de Decisão)**: ADRs em `docs/adrs/` são um histórico histórico e **nunca devem ser sobrescritos/alterados** para mudar uma decisão. Se a arquitetura mudar, **pergunte ao usuário** se faz sentido criar um novo ADR (com número sequencial novo) para documentar a mudança e substituir a decisão anterior.

## Código

- Sem comentários óbvios. Comente só decisões não evidentes (workaround, regra
  de negócio contraintuitiva, limitação externa).
  - Proibido: `// incrementa o contador` acima de `count++`.
  - Aceitável: `// PgBouncer em transaction mode não suporta prepared statements`.
- Código idiomático da stack, funções pequenas, erro tratado explicitamente,
  sem código morto nem duplicação.
- Nada de emojis na UI nem nas mensagens de log novas; ícones vêm de `lucide-react`.
- Nunca commitar `.env`. Variável de ambiente nova vai para `.env.example`.

## Git

- **SEMPRE** atualize a `main` antes de criar um novo branch (`git checkout main && git pull origin main`).
- Branches curtas a partir de `main`: `feat/…`, `fix/…`, `refactor/…`, `test/…`,
  `docs/…`, `chore/…`.
- Commits no padrão Conventional Commits, com escopo:
  `<tipo>(<escopo>): <descrição>`. Exemplos:
  - `feat(goals): adicionar categoria às metas`
  - `fix(api): propagar contexto da requisição no repository de entry`
- Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `perf`, `chore`.
- Toda entrega vai por Pull Request citando a issue (`Closes #N`). Fluxo
  completo na skill `finplan-pr-workflow`.
- `package.json` e `package-lock.json` sempre sincronizados.

## Skills do projeto (`.agents/skills/`)

| Skill | Quando usar |
|---|---|
| `finplan-feature-implementation` | Implementar ou alterar feature, campo, endpoint, tela ou cálculo |
| `finplan-backend-review` | Revisar/auditar código Go em `apps/api` (somente leitura) |
| `finplan-frontend-review` | Revisar/auditar código React em `apps/web` (somente leitura) |
| `finplan-issue-creation` | Escrever ou abrir issue no GitHub |
| `finplan-pr-workflow` | Criar branch, commitar e abrir PR |

## Regras de Workflow do Agente (Strict)

- **Sem código "Fake" ou Stubs**: Nunca crie implementações vazias (ex: `return nil, nil`) ou stubs apenas para forçar a compilação ou testes a passarem. Se uma refatoração exige a implementação de interfaces, implemente-as corretamente de ponta a ponta ou informe ao usuário sobre o bloqueio.
- **Revisão Obrigatória**: **Nunca** execute `git commit`, `git push`, ou utilize a skill de criar Pull Requests sem apresentar as mudanças e receber a aprovação explícita do usuário. O usuário deve revisar o código localmente primeiro.
