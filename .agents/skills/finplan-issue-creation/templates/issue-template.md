## Resumo

Uma ou duas frases dizendo o que precisa acontecer e por quê.

**Tipo:** feature | bug | refactor | tech-debt

## Contexto

Situação atual do sistema relevante para esta issue: o que existe hoje, onde
vive no código (arquivos, endpoints, tabelas, componentes) e qual é a dor ou
oportunidade. Citar apenas o que foi conferido no código.

## Objetivo

O resultado esperado, do ponto de vista de quem usa o sistema ou de quem
mantém o código.

## Escopo

**Inclui**
- item

**Não inclui**
- item deixado de fora de propósito, para evitar expansão de escopo

## Comportamento atual vs. esperado

_Somente para `bug`._

| | Descrição |
|---|---|
| Atual | |
| Esperado | |

## Passos para reproduzir

_Somente para `bug`._

1. passo
2. passo
3. resultado observado

**Ambiente:** local | produção, navegador/versão, ano de orçamento afetado, se relevante.

## Proposta de solução

Abordagem sugerida em alto nível, respeitando as decisões arquiteturais já
documentadas (camadas handler → service → repository, cálculos agregados no
SQL, PATCH parcial, atualização otimista no frontend, `reserve_movement`
imutável). Listar alternativas descartadas quando houver.

Para `bug`, indicar a causa provável como **hipótese** e o arquivo onde
começar a investigar.

## Áreas impactadas

- [ ] Backend (`apps/api`)
- [ ] Banco de dados / migration
- [ ] Contrato de API (`docs/API.md`)
- [ ] Frontend (`apps/web`)
- [ ] Documentação (`docs/ARCHITECTURE.md`, `docs/adrs/`, `README.md`)
- [ ] Regras e skills de agente (`AGENTS.md`, `.agents/skills/`)
- [ ] Infra / Docker / CI

## Mudanças de contrato e dados

Preencher só se marcado em banco ou API.

- **Schema:** tabelas/colunas criadas, alteradas ou removidas, e o impacto em dados existentes.
- **API:** endpoints novos ou alterados, com método, path e formato mínimo de request/response.
- **Compatibilidade:** o que quebra para clientes existentes (frontend web, futuro app Android) e como será tratado.

## Critérios de aceite

- [ ] Critério observável e verificável
- [ ] Critério observável e verificável
- [ ] Caminho de erro coberto (falha de rede, dado inválido, registro inexistente)

## Plano de testes

- **Unitários:** o que cobrir (Go: service/repository; Vitest: lógica pura).
- **Integração/E2E:** fluxos que precisam ser exercitados ponta a ponta.
- **Manual:** roteiro curto para validar a tela ou o endpoint.

## Dependências e bloqueios

- Issues, migrations ou decisões que precisam existir antes. Se nenhuma, escrever "Nenhuma".

## Riscos

- Risco e mitigação, incluindo perda de dados, regressão em telas existentes e mudança de contrato.

## Dúvidas em aberto

- Decisões que dependem do dono do projeto e não puderam ser inferidas do código.

## Definição de pronto

- [ ] Critérios de aceite atendidos
- [ ] Testes adicionados ou atualizados e passando
- [ ] `docs/API.md` e `docs/ARCHITECTURE.md` atualizados quando o contrato ou a arquitetura mudarem
- [ ] Revisão feita com a skill de review correspondente (`finplan-backend-review` e/ou `finplan-frontend-review`)

## Referências

- Arquivos, docs, issues e PRs relacionados.
