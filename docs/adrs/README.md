# 📜 FinPlan — Architecture Decision Records (ADRs)

Este diretório contém os **Registros de Decisões Arquiteturais (ADRs — Architecture Decision Records)** do projeto **FinPlan**.

Os ADRs capturam decisões arquiteturais críticas tomadas ao longo da evolução do sistema, documentando o contexto, as alternativas consideradas, a justificativa da decisão escolhida e suas consequências (positivas, negativas e trade-offs).

---

## 🧭 Estrutura e Ciclo de Vida de um ADR

Cada documento segue a estrutura:
- **Título e Numeração**: `ADR-XXXX: Título Descritivo`
- **Status**:
  - `Proposto` (*Proposed*): Sob discussão/avaliação.
  - `Aceito` (*Accepted*): Implementado e em vigor.
  - `Substituído` (*Superseded*): Substituído por um ADR posterior (com link de referência cruzada).
  - `Depreciado` (*Deprecated*): Não mais válido ou abandonado.
- **Data**: Data de decisão formal.
- **Contexto**: O problema enfrentado, requisitos de negócio e restrições técnicas.
- **Decisão**: A solução adotada e diretrizes de implementação.
- **Consequências**: Ganhos, trade-offs e mitigações associadas.
- **Referências**: Links para código, migrações SQL, contratos de API e documentação.

---

## 📑 Índice de Decisões Registradas

| ID | Título | Status | Data | Resumo |
|---|---|---|---|---|
| [**ADR-0001**](0001-arquitetura-monorepo-com-deploys-desacoplados.md) | Arquitetura Monorepo com Deploys Desacoplados (Go REST API + React SPA) | `Aceito` | 2026-01-15 | Adoção de monorepo estruturado com `apps/web` e `apps/api` e pipelines de CI/CD independentes. |
| [**ADR-0002**](0002-migracao-de-nosql-para-postgresql-relacional.md) | Migração de Persistência NoSQL (MongoDB Documento Único) para Relacional (PostgreSQL) | `Aceito` | 2026-09-20 | Transição do modelo de documento único NoSQL para schema relacional normalizado no PostgreSQL (`NUMERIC(12,2)` e integridade referencial). |
| [**ADR-0003**](0003-interface-reativa-com-atualizacoes-otimistas.md) | Interface Reativa com Atualizações Otimistas e Rollback Automático | `Aceito` | 2026-09-21 | Eliminação do cache de dados local em `localStorage` em favor de Server-First com Optimistic UI de 0ms e rollback com Toast. |
| [**ADR-0004**](0004-modelo-planejado-vs-realizado-em-entries-mensais.md) | Modelo Mensal Explícito Planejado vs. Realizado (`item` e `entry`) | `Aceito` | 2026-09-22 | Separação de itens orçamentários em 12 entradas mensais (`entry`) com valores planejados e realizados (`paid_date`). |
| [**ADR-0005**](0005-projetos-hierarquicos-de-custos-pontuais-com-margem.md) | Projetos Hierárquicos de Custos Pontuais com Margem de Imprevistos (`cost` e `cost_item`) | `Aceito` | 2026-09-23 | Estruturação de despesas não recorrentes como projetos compostos por múltiplos itens e cálculo server-side de margem. |
| [**ADR-0006**](0006-reserva-de-emergencia-como-livro-razao-imutavel.md) | Reserva de Emergência como Livro-Razão Imutável (`reserve_movement`) | `Aceito` | 2026-09-24 | Modelagem de movimentações de reserva exclusivamente via `POST` e `GET`, sem rotas de `PATCH` ou `DELETE`. |
| [**ADR-0007**](0007-calculos-agregados-e-saldo-acumulado-server-side.md) | Consolidação Contábil Server-Side com Window Functions SQL (`/summary`) | `Substituído` | 2026-09-25 | Apuração de totais mensais e saldo acumulado no PostgreSQL. Substituído pelo ADR-0013. |
| [**ADR-0008**](0008-semantica-de-patch-parcial-estrita.md) | Semântica de Atualização Parcial Estrita (PATCH Dinâmico com Ponteiros em Go) | `Aceito` | 2026-09-26 | Implementação de endpoints `PATCH` com campos ponteiro e geração seletiva de SQL para evitar sobrescrita de dados. |
| [**ADR-0009**](0009-estrategia-de-identificadores-uuidv4-e-chaves-naturais.md) | Estratégia de Identificadores: UUIDv4 vs Chave Natural | `Aceito` | 2026-09-26 | Utilização de chave natural para orçamentos anuais (`id = '2026'`) e UUIDv4 nativo para todas as entidades granulares. |
| [**ADR-0010**](0010-gerenciamento-e-versionamento-de-migracoes-com-goose.md) | Gerenciamento e Versionamento de Migrações de Banco de Dados com Goose | `Aceito` | 2026-09-27 | Adoção do Goose (`pressly/goose/v3`) com migrações SQL embutidas via `embed.FS`, imutabilidade de scripts e versionamento incremental. |
| [**ADR-0011**](0011-migracao-estado-tanstack-query-zustand.md) | Migração de Estado Local para TanStack Query e Zustand | `Aceito` | 2026-09-28 | Padronização do gerenciamento de estado assíncrono e global. |
| [**ADR-0012**](0012-adocao-spec-driven-development-openapi.md) | Adoção de Spec-Driven Development via OpenAPI | `Aceito` | 2026-09-29 | Uso da especificação OpenAPI 3.0 como contrato único. |
| [**ADR-0013**](0013-consolidacao-contabil-em-memoria-go.md) | Consolidação Contábil em Memória (Go) e Integração de Reserva | `Aceito` | 2026-10-04 | Movimentação da lógica de agregações de SQL para Go, facilitando injeção de transferências de reserva no saldo acumulado. |

---

## ✍️ Como Propor um Novo ADR

1. Crie uma cópia do arquivo modelo ou siga a numeração sequencial `XXXX-<nome-da-decisao>.md`.
2. Detalhe o contexto do problema e as alternativas rejeitadas.
3. Obtenha aprovação do time/mantenedores via Pull Request.
4. Atualize a tabela deste índice (`docs/adrs/README.md`).
