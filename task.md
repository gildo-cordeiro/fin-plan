# TAREFA: Geração Completa de Documentação Técnica

Você é responsável por criar (ou atualizar, se já existir) toda a documentação
técnica deste repositório: [NOME_DO_PROJETO].

Antes de escrever qualquer coisa, faça uma varredura completa do código-fonte
(estrutura de pastas, dependências, configs, testes, endpoints, schemas) para
garantir que a documentação reflita o estado REAL do projeto — nunca invente
funcionalidades, endpoints ou dependências que não existem no código.

## Entregáveis

### 1. README.md (raiz do projeto)
- Nome e descrição curta do projeto (1-2 frases)
- Badges relevantes (build, licença, stack) se aplicável
- Stack tecnológica (frontend, backend, banco de dados, deploy)
- Pré-requisitos (versões de Node, runtime, etc.)
- Instruções de instalação (`clone`, `install`, variáveis de ambiente com `.env.example`)
- Como rodar localmente (dev, build, testes)
- Estrutura de pastas resumida (árvore de 2 níveis com um comentário por pasta)
- Scripts disponíveis (package.json / Makefile)
- Link para ARCHITECTURE.md e demais docs
- Como contribuir (se relevante) e licença

### 2. docs/ARCHITECTURE.md
- Visão geral da arquitetura (1 parágrafo)
- Diagrama Mermaid do fluxo principal (ex: cliente → API → banco), incluindo
  camadas de persistência se houver (ex: local-first, cache, debounce/sync)
- Decisões arquiteturais relevantes e o porquê (ex: local-first vs server-first,
  serverless vs monolito)
- Principais módulos/domínios e suas responsabilidades
- Modelo de dados (entidades principais e relacionamentos — Mermaid ER se fizer sentido)
- Fluxo de autenticação/autorização, se existir (ou observação explícita se NÃO existir)
- Pontos de extensão e limitações conhecidas atuais

### 3. docs/API.md (se houver endpoints/API)
- Lista de endpoints com método, path, payload, resposta e códigos de erro
- Agrupar por domínio/recurso

### 4. .agents/skills/ (skills para uso do próprio agente)
Gerar ou atualizar os arquivos de skill seguindo o padrão que já uso:
- `backend-patterns.md` — convenções de backend, camadas, tratamento de erro
- `frontend-patterns.md` — design system, componentes, convenções de estado
- `git-workflow.md` — padrão de commits, branches, PRs
- `full-stack-task.md` — skill orquestradora: como abordar uma tarefa ponta a ponta neste projeto
Cada skill deve ser objetiva, com exemplos reais extraídos do código (não genéricos),
e deve citar arquivos/pastas reais como referência.

## Validação obrigatória contra o código atual
Antes de finalizar CADA entregável, valide linha por linha o que foi escrito
contra o código-fonte real:
- Todo endpoint documentado precisa existir de fato no código (path, método,
  payload e resposta batendo com a implementação atual — não com versões antigas).
- Toda dependência/versão citada deve vir do package.json/lock file real, não de memória.
- Toda variável de ambiente citada deve existir em uso real no código (grep antes de documentar).
- Todo comando de setup/build/test deve ser executado (ou pelo menos conferido
  contra os scripts reais) antes de ser incluído no README.
- Toda skill gerada deve referenciar arquivos/pastas que existem de fato no
  repositório — se citar um exemplo, ele precisa ser um trecho real do código, não inventado.
- Se a documentação anterior (README/ARCHITECTURE/skills existentes) contradiser
  o código atual, isso é uma inconsistência a ser corrigida, não replicada.

Ao final, inclua uma seção "Validação" no changelog listando explicitamente:
o que foi conferido contra o código, o que não pôde ser validado (e por quê),
e qualquer divergência encontrada entre docs antigas e o estado atual do projeto.

## Regras
- Baseie-se SOMENTE no que existe no código. Se algo estiver ambíguo ou faltando
  (ex: sem testes, sem CI), diga explicitamente na documentação em vez de omitir.
- Use Markdown limpo, headers consistentes (##, ###), sem enrolação.
- Diagramas em Mermaid sempre que ajudar a entender fluxo/arquitetura.
- Ao final, liste um changelog do que foi criado/atualizado e quaisquer
  inconsistências encontradas no código que valham um follow-up.
- Se encontrar documentação antiga desatualizada, não apague sem avisar — 
  sinalize o que mudou.