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
      const needsReserveWithdrawal = m.accumulatedBalance < 0;
      const withdrawalAmount = needsReserveWithdrawal ? Math.abs(m.accumulatedBalance) : 0;
      return {
        label: m.month.shortName,
        sublabel: m.month.name,
        value: m.accumulatedBalance,
        income: m.income,
        expenses: m.totalExpenses,
        monthBalance: m.monthBalance,
        needsReserveWithdrawal,
        withdrawalAmount,
      };
    }),
  ];

  const values = dataPoints.map((p) => p.value).concat([0]);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const valSpan = maxVal - minVal || 1;

  const n = dataPoints.length;
  const W = Math.max(500, n * 52);
  const H = 210;
  const padLeft = 30;
  const padRight = 30;
  const padTop = 20;
  const padBottom = 30;

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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between h-full shadow-2xs transition-shadow duration-200">
      {/* Cabeçalho & Legenda */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 min-h-[28px]">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Trajetória do Saldo Acumulado
          </span>
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

      {/* Gráfico SVG */}
      <div className="overflow-x-auto pb-1 my-auto">
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
              className="font-mono select-none"
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
                  {/* Linha guia vertical com fade suave */}
                  <line
                    x1={cx}
                    y1={padTop}
                    x2={cx}
                    y2={H - padBottom}
                    stroke="#94a3b8"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    opacity={isHovered ? 1 : 0}
                    className="transition-opacity duration-200"
                  />

                  {/* Anel de alerta de déficit caso necessite retirada da reserva */}
                  {hasDeficit && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 9 : 7}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      strokeOpacity={0.7}
                      className="transition-all duration-200 ease-out"
                    />
                  )}

                  {/* Círculo do ponto */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 6.5 : 4}
                    fill={dotColor}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    className="transition-all duration-200 ease-out"
                  />

                  {/* Rótulo inferior do mês */}
                  <text
                    x={cx}
                    y={H - 8}
                    textAnchor="middle"
                    fontSize="10"
                    fill={isHovered ? '#0e6b7a' : '#627282'}
                    fontWeight={isHovered ? '700' : '500'}
                    className="transition-colors duration-150 select-none"
                  >
                    {pt.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Tooltip de detalhes inferior com animação suave e altura fixa */}
      <div className="mt-3 min-h-[38px] px-3 py-1.5 flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 transition-all duration-200">
        {currentHover ? (
          <div className="w-full flex flex-wrap items-center justify-between gap-2 transition-all duration-200 ease-out opacity-100">
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
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 transition-all duration-200">
                    ⚠️ Retirar <strong className="font-mono">{formatBRL(currentHover.withdrawalAmount)}</strong> da reserva para não negativar (déficit do mês: {formatBRL(Math.abs(currentHover.monthBalance))}, amortizado pelo saldo em conta)
                  </span>
                ) : currentHover.monthBalance < 0 ? (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-300 transition-all duration-200">
                    ℹ️ Gastos acima da renda em {formatBRL(Math.abs(currentHover.monthBalance))}, mas coberto 100% pelo saldo em conta
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 transition-all duration-200">
                    🟢 Sobra de <strong className="font-mono">{formatBRL(currentHover.monthBalance)}</strong> no mês (dinheiro livre)
                  </span>
                )
              )}
            </div>
          </div>
        ) : (
          <span className="text-slate-400 text-[11px] transition-opacity duration-200">
            Passe o mouse ou toque nos pontos do gráfico para ver a sobra do mês ou o valor a retirar da reserva.
          </span>
        )}
      </div>
    </div>
  );
};
