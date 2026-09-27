# ADR-0001: Arquitetura Monorepo com Deploys Desacoplados (Go REST API + React SPA)

- **Status**: Aceito
- **Data**: 2026-01-15
- **Decisores**: Equipe FinPlan

---

## 1. Contexto

O **FinPlan** é composto por duas camadas centrais com ciclos de vida e tecnologias distintas:
1. **Frontend**: Uma Single Page Application (SPA) construída com React 18, TypeScript, Vite e Tailwind CSS, exigindo compilação estática e hospedagem em rede de distribuição de conteúdo (CDN / Edge).
2. **Backend**: Uma API REST de alta eficiência desenvolvida em Go, empacotada em container Docker e hospedada em ambiente de execução de containers (Render, Google Cloud Run ou VPS).

A manutenção dessas camadas em repositórios separados (polyrepo) introduziria:
- Dificuldade no versionamento coordenado de contratos de API e schemas.
- Fragmentação da documentação técnica e de regras de negócio.
- Complexidade em Pull Requests que envolvem alterações full-stack.
- Sobrecarga de manutenção de repositórios, segredos e permissões duplicadas.

---

## 2. Decisão

Adotamos a arquitetura de **Monorepo** sem tooling de monorepo invasivo (como Nx ou Turborepo), mantendo:
1. **Isolamento de Diretórios de Aplicação**:
   - `apps/web`: Contém todo o ecossistema Node.js / Vite / React, com seu próprio `package.json`, suíte Vitest e testes Playwright.
   - `apps/api`: Contém o módulo Go nativo (`github.com/gildo-cordeiro/fin-plan/apps/api`), com seu próprio `go.mod` e `Dockerfile`.
2. **Documentação e Orquestração Compartilhadas**:
   - `docs/`: Documentação centralizada de arquitetura, contratos de API e registros de decisões.
   - `docker-compose.yml`: Na raiz do repositório, facilitando a inicialização de serviços dependentes para desenvolvimento local.
3. **Deploys e Pipelines de CI/CD Totalmente Desacoplados**:
   - `.github/workflows/deploy-web.yml`: Aciona o build e deploy do frontend na Vercel via CLI da Vercel.
   - `.github/workflows/deploy-api.yml`: Dispara o deploy hook no provedor de container da API (ex: Render).
   - `.github/workflows/ci.yml`: Valida a integridade de ambas as aplicações (typecheck, lint, testes unitários).

---

## 3. Consequências

### 3.1. Positivas
- **Contratos Coesos**: Mudanças de contratos HTTP e tipos TypeScript/Go são comitadas e revisadas no mesmo Pull Request.
- **Onboarding Simplificado**: Um único comando `git clone` disponibiliza todo o ecossistema do projeto para novos desenvolvedores.
- **Simplicidade Operacional**: Não há dependência de gerenciadores complexos de monorepo; scripts simples no root e nos subdiretórios atendem plenamente ao escopo.

### 3.2. Negativas e Trade-offs
- **Configuração de Provedores de Deploy**: Exige configurar o *Root Directory* explicitamente nos provedores de nuvem (ex: `apps/web` na Vercel e `apps/api` no container de backend).
- **Execução de Comandos**: Desenvolvedores devem navegar até o subdiretório apropriado (`cd apps/web` ou `cd apps/api`) para rodar comandos específicos de cada ecossistema.

---

## 4. Referências

- [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md)
- [`docker-compose.yml`](../../docker-compose.yml)
- [`.github/workflows/deploy-web.yml`](../../.github/workflows/deploy-web.yml)
- [`.github/workflows/deploy-api.yml`](../../.github/workflows/deploy-api.yml)
