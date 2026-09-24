import { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { formatBRL } from '../../utils/formatters';

export const CashFlowChart = () => {
  const { monthlySummaries, state } = useBudget();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const dataPoints = [
    {
      label: 'Hoje',
      sublabel: 'Saldo Inicial em Caixa',
      value: state.simulation.initialBalance,
      income: 0,
      expenses: 0,
      monthBalance: 0,
      needsReserveWithdrawal: false,
      withdrawalAmount: 0,
    },
    ...monthlySummaries.map((m) => {
      const isDeficit = m.monthBalance < 0;
      return {
        label: m.month.shortName,
        sublabel: m.month.name,
        value: m.accumulatedBalance,
        income: m.income,
        expenses: m.totalExpenses,
        monthBalance: m.monthBalance,
        needsReserveWithdrawal: isDeficit,
        withdrawalAmount: isDeficit ? Math.abs(m.monthBalance) : 0,
      };
    }),
  ];

  const deficitMonths = dataPoints.filter((p) => p.needsReserveWithdrawal);
  const totalWithdrawal = deficitMonths.reduce((acc, p) => acc + p.withdrawalAmount, 0);

  const values = dataPoints.map((p) => p.value).concat([0]);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const valSpan = maxVal - minVal || 1;

  const n = dataPoints.length;
  const W = Math.max(500, n * 52);
  const H = 220;
  const padLeft = 35;
  const padRight = 35;
  const padTop = 25;
  const padBottom = 32;

  const getX = (idx: number) => padLeft + (idx * (W - padLeft - padRight)) / Math.max(1, n - 1);
  const getY = (val: number) => padTop + (1 - (val - minVal) / valSpan) * (H - padTop - padBottom);

  const zeroY = getY(0);

  // Caminho da linha de saldo acumulado
  const linePath = dataPoints
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx).toFixed(1)} ${getY(p.value).toFixed(1)}`)
    .join(' ');

  // Área translúcida sob a linha
  const areaPath = `${linePath} L ${getX(n - 1)} ${H - padBottom} L ${getX(0)} ${H - padBottom} Z`;

  const currentHover = hoveredIdx !== null ? dataPoints[hoveredIdx] : null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
      {/* Cabeçalho & Legenda */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Trajetória do Saldo Acumulado
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Evolução do dinheiro disponível na conta ao longo dos meses.
          </p>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0e6b7a] inline-block"></span>
            Saldo acumulado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-300 dark:ring-amber-900 inline-block"></span>
            Retirada da reserva (déficit)
          </span>
        </div>
      </div>

      {/* Banner explicativo de necessidade de retirada da reserva */}
      {deficitMonths.length > 0 ? (
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200">
          <span className="text-base shrink-0">💡</span>
          <div className="leading-snug">
            <strong>Retirada da Reserva:</strong> Em{' '}
            <strong>{deficitMonths.map((m) => m.label).join(', ')}</strong> você terá um déficit de gastos de{' '}
            <strong className="font-mono">{formatBRL(totalWithdrawal)}</strong> que precisará ser retirado da sua reserva para cobrir as contas. Nos demais meses, o fluxo fecha com sobra!
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/50 text-xs text-emerald-800 dark:text-emerald-300">
          <span>✨</span>
          <span>
            <strong>Fluxo Autossustentável:</strong> Suas receitas cobrem todas as despesas em todos os meses. Nenhuma retirada da reserva será necessária!
          </span>
        </div>
      )}

      {/* Gráfico SVG */}
      <div className="overflow-x-auto pb-1">
        <div style={{ minWidth: W }} className="relative select-none">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
            <defs>
              <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0e6b7a" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#0e6b7a" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Linha Zero (Equilíbrio de Caixa) */}
            <line
              x1={padLeft}
              y1={zeroY}
              x2={W - padRight}
              y2={zeroY}
              stroke="#cbd5e1"
              className="dark:stroke-slate-700"
              strokeDasharray="3 3"
              strokeWidth="1.2"
            />
            <text
              x={W - padRight + 4}
              y={zeroY + 3}
              fontSize="9"
              fill="#94a3b8"
              fontWeight="600"
              className="font-mono"
            >
              R$ 0
            </text>

            {/* Área sombreada sob a curva */}
            <path d={areaPath} fill="url(#cashGradient)" />

            {/* Linha Principal de Caixa */}
            <path
              d={linePath}
              fill="none"
              stroke="#0e6b7a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Pontos interativos */}
            {dataPoints.map((pt, idx) => {
              const cx = getX(idx);
              const cy = getY(pt.value);
              const isHovered = hoveredIdx === idx;
              const hasDeficit = pt.needsReserveWithdrawal;
              const isNegative = pt.value < 0;

              const dotColor = isNegative
                ? '#e11d48'
                : hasDeficit
                ? '#f59e0b'
                : '#0e6b7a';

              return (
                <g
                  key={idx}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="cursor-pointer"
                >
                  {isHovered && (
                    <line
                      x1={cx}
                      y1={padTop}
                      x2={cx}
                      y2={H - padBottom}
                      stroke="#94a3b8"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                  )}

                  {/* Anel de alerta caso necessite retirada da reserva */}
                  {hasDeficit && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 9 : 7}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      strokeOpacity={0.6}
                      className="animate-pulse"
                    />
                  )}

                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 6.5 : 4}
                    fill={dotColor}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  />

                  {/* Rótulo inferior do mês */}
                  <text
                    x={cx}
                    y={H - 8}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#627282"
                    fontWeight={isHovered ? '700' : '500'}
                  >
                    {pt.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Tooltip de detalhes compacto e fixo abaixo */}
      <div className="min-h-8 px-3 py-2 flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300">
        {currentHover ? (
          <div className="w-full flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {currentHover.sublabel}:
              </span>
              <span
                className={`font-mono font-bold ${
                  currentHover.value < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-[#0e6b7a] dark:text-[#4ec2d3]'
                }`}
              >
                Saldo acumulado: {formatBRL(currentHover.value)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {currentHover.label !== 'Hoje' && (
                currentHover.needsReserveWithdrawal ? (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300">
                    ⚠️ Retirar <strong className="font-mono">{formatBRL(currentHover.withdrawalAmount)}</strong> da reserva para cobrir gastos
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                    🟢 Sobra de <strong className="font-mono">{formatBRL(currentHover.monthBalance)}</strong> no mês (dinheiro livre)
                  </span>
                )
              )}
            </div>
          </div>
        ) : (
          <span className="text-slate-400 text-[11px]">
            Passe o mouse ou toque nos pontos do gráfico para ver a sobra do mês ou o valor a retirar da reserva.
          </span>
        )}
      </div>
    </div>
  );
};
