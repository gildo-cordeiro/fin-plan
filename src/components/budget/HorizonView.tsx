import { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { formatBRL } from '../../utils/formatters';
import { MonthHorizonBar } from '../months/MonthHorizonBar';
import { CashFlowChart } from '../dashboard/CashFlowChart';
import { MonthlyBarChart } from '../dashboard/MonthlyBarChart';
import { MonthlySummaryTable } from '../summary/MonthlySummaryTable';
import { BarChart3, TrendingUp, Layers } from 'lucide-react';

export const HorizonView = () => {
  const { monthlySummaries } = useBudget();
  const [chartDisplay, setChartDisplay] = useState<'both' | 'line' | 'bar'>('line');

  const deficitMonths = monthlySummaries.filter((m) => m.accumulatedBalance < 0);
  const totalReserveWithdrawal = deficitMonths.reduce(
    (acc, m) => acc + Math.abs(m.accumulatedBalance),
    0
  );

  return (
    <div className="space-y-4">
      {/* Barra de controle de horizonte temporal (meses visíveis, atalhos de 6/12/24 meses) */}
      <MonthHorizonBar />

      {/* ── Painel de Projeções e Gráficos Multi-Meses ── */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>📈</span>
              <span>Projeção Financeira & Visualização de Fluxo</span>
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Visualize a curva de liquidez acumulada e a composição mensal de entradas versus saídas.
            </p>
          </div>

          {/* Segmented Control para seleção de gráfico */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setChartDisplay('line')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                chartDisplay === 'line'
                  ? 'bg-white dark:bg-slate-900 text-[#0e6b7a] dark:text-[#4ec2d3] shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Evolução do Saldo</span>
            </button>

            <button
              type="button"
              onClick={() => setChartDisplay('bar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                chartDisplay === 'bar'
                  ? 'bg-white dark:bg-slate-900 text-[#0e6b7a] dark:text-[#4ec2d3] shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Renda × Despesas</span>
            </button>

            <button
              type="button"
              onClick={() => setChartDisplay('both')}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                chartDisplay === 'both'
                  ? 'bg-white dark:bg-slate-900 text-[#0e6b7a] dark:text-[#4ec2d3] shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Exibir Ambos</span>
            </button>
          </div>
        </div>

        {/* Banner Informativo de Retirada da Reserva (largura total para manter os gráficos perfeitamente alinhados) */}
        {totalReserveWithdrawal > 0 && (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 shadow-2xs transition-all duration-300">
            <span className="text-base shrink-0">💡</span>
            <div className="leading-snug">
              <strong>Retirada da Reserva:</strong> Em{' '}
              <strong>{deficitMonths.map((m) => m.month.shortName).join(', ')}</strong> você precisará retirar{' '}
              <strong className="font-mono">{formatBRL(totalReserveWithdrawal)}</strong> da reserva para não deixar a conta no vermelho (o saldo que você já tinha em conta cobre o restante do déficit do mês). Nos demais meses, o fluxo fecha positivo sem tocar na reserva!
            </div>
          </div>
        )}

        {/* Renderização condicional dos gráficos em grid perfeitamente simétrico */}
        {chartDisplay === 'both' ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
            <CashFlowChart />
            <MonthlyBarChart />
          </div>
        ) : chartDisplay === 'line' ? (
          <CashFlowChart />
        ) : (
          <MonthlyBarChart />
        )}
      </section>

      {/* ── Tabela Analítica de Resumo Consolidado 12 Meses ── */}
      <section className="space-y-1">
        <MonthlySummaryTable />
      </section>
    </div>
  );
};
