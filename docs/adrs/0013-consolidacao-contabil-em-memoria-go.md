# ADR-0013: Consolidação Contábil em Memória (Go) e Integração de Reserva

- **Status**: Aceito
- **Data**: 2026-10-04
- **Decisores**: Equipe FinPlan
- **Substitui**: [ADR-0007](./0007-calculos-agregados-e-saldo-acumulado-server-side.md)

---

## 1. Contexto

O [ADR-0007](./0007-calculos-agregados-e-saldo-acumulado-server-side.md) havia estabelecido que o cálculo de consolidação mensal (incluindo totais agregados e o saldo acumulado) deveria ser efetuado puramente no motor do PostgreSQL via `Window Functions` e subqueries. O objetivo original era retirar a carga de cálculo do frontend (`budgetCalculator.ts`) e garantir precisão matemática.

No entanto, com a evolução das regras de negócio, especialmente a integração com o **Livro-Razão da Reserva de Emergência** (ADR-0006), manter lógicas complexas e condicionais dentro de consultas SQL tornou a manutenção, leitura e os testes automatizados da camada de banco de dados (`repository.go`) excessivamente difíceis e suscetíveis a bugs sutis. O cálculo não escalava bem ao precisar entrelaçar despesas, custos pontuais e as novas transferências entre caixa e reserva (`ReserveMovement`).

---

## 2. Decisão

Decidimos transferir a responsabilidade da consolidação matemática estrita do banco de dados (SQL) para a aplicação (Go), mantendo os cálculos server-side, mas **em memória**:

1. **Cálculo em Memória com Go (`budget.go`)**: 
   - A função `CalculateSummary` foi centralizada na entidade do domínio.
   - O backend busca todas as fatias necessárias do banco via repositórios em formato bruto (`items`, `costs`, `movements`), repassa ao domínio e itera sobre as variáveis (de 1 a 12 meses) de forma síncrona.
   
2. **Integração das Movimentações de Reserva (`reserveTransfers`)**:
   - Para resolver distorções de saldo acumulado, saques ou aportes na reserva agora afetam o fluxo de caixa do mês correspondente de forma matemática.
   - O campo `reserveTransfers` passa a integrar formalmente a resposta da API (`MonthSummary` e `YearTotals`), tornando visível na arquitetura como a reserva cobriu um déficit ou sugou recursos de um mês.

---

## 3. Consequências

### 3.1. Positivas
- **Manutenibilidade e Testabilidade**: Mover o cálculo de SQL para Go tornou extremamente fácil escrever testes unitários independentes de banco de dados (ver `budget_test.go`), garantindo que novas regras (como `reserveTransfers`) sejam injetadas sem quebrar as queries.
- **Isolamento do Repositório**: A camada de persistência volta a ser restrita a comandos básicos de CRUD, sem lidar com regras financeiras.
- **Precisão Mantida**: Permanecemos livres de erros de ponto flutuante do navegador.

### 3.2. Negativas e Trade-offs
- **Maior Consumo de Memória na API**: A aplicação agora carrega múltiplos arrays em memória antes de agregar, diferentemente da delegação ao Postgres. Contudo, dado o volume anual de registros de um planejamento pessoal padrão, esse custo de latência e de memória é ínfimo e plenamente aceitável.

---

## 4. Referências

- [`apps/api/internal/budget/budget.go`](../../apps/api/internal/budget/budget.go)
- [`docs/openapi.yaml`](../openapi.yaml)
- [ADR-0006: Reserva de Emergência como Livro-Razão Imutável](./0006-reserva-de-emergencia-como-livro-razao-imutavel.md)
