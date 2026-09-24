import { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { formatBRL } from '../../utils/formatters';

export const CashFlowChart = () => {
  const { monthlySummaries, state } = useBudget();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const dataPoints = [
    {
      label: 'Hoje',
      sublabel: 'Saldo Inicial',
      value: state.simulation.initialBalance,
      income: 0,
      expenses: 0,
    },
    ...monthlySummaries.map((m) => ({
      label: m.month.shortName,
      sublabel: m.month.name,
      value: m.accumulatedBalance,
      income: m.income,
      expenses: m.totalExpenses,
    })),
  ];

  const reserva = state.simulation.emergencyReserve;
  const values = dataPoints.map((p) => p.value).concat([0, reserva]);
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
  const reservaY = getY(reserva);

  // Caminho da linha
  const linePath = dataPoints
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx).toFixed(1)} ${getY(p.value).toFixed(1)}`)
    .join(' ');

  // Área translúcida sob a linha
  const areaPath = `${linePath} L ${getX(n - 1)} ${H - padBottom} L ${getX(0)} ${H - padBottom} Z`;

  const currentHover = hoveredIdx !== null ? dataPoints[hoveredIdx] : null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Trajetória do Saldo Acumulado
        </h3>
        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0e6b7a] inline-block"></span>
            Saldo acumulado
          </span>
          {reserva > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 border-t border-dashed border-[#c09420] inline-block"></span>
              Reserva protegida
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div style={{ minWidth: W }} className="relative select-none">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
            <defs>
              <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0e6b7a" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#0e6b7a" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Linha Zero (Base Neutra) */}
            <line
              x1={padLeft}
              y1={zeroY}
              x2={W - padRight}
              y2={zeroY}
              stroke="#dbe3e9"
              className="dark:stroke-slate-700"
              strokeWidth="1"
            />

            {/* Faixa / Banda da Reserva de Emergência (Alerta se cair abaixo) */}
            {reserva > 0 && (
              <>
                <rect
                  x={padLeft}
                  y={Math.min(zeroY, reservaY)}
                  width={W - padLeft - padRight}
                  height={Math.abs(zeroY - reservaY)}
                  fill="#c09420"
                  fillOpacity="0.06"
                />
                <line
                  x1={padLeft}
                  y1={reservaY}
                  x2={W - padRight}
                  y2={reservaY}
                  stroke="#c09420"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
                <text
                  x={W - padRight + 4}
                  y={reservaY + 3}
                  fontSize="9"
                  fill="#c09420"
                  fontWeight="600"
                  className="font-mono"
                >
                  Reserva
                </text>
              </>
            )}

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
              const color =
                pt.value < 0
                  ? '#e11d48'
                  : reserva > 0 && pt.value < reserva
                  ? '#c09420'
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

                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 6.5 : 4}
                    fill={color}
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
      <div className="mt-2 h-7 px-2.5 flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300">
        {currentHover ? (
          <div className="w-full flex items-center justify-between">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {currentHover.sublabel}:
            </span>
            <div className="flex items-center gap-3">
              <span
                className={`font-mono font-bold ${
                  currentHover.value < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-[#0e6b7a] dark:text-[#4ec2d3]'
                }`}
              >
                {formatBRL(currentHover.value)}
              </span>
              {reserva > 0 && currentHover.value < reserva && (
                <span
                  className={`text-[10px] font-medium ${
                    currentHover.value < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {currentHover.value < 0
                    ? `⚠️ Saldo no vermelho (${formatBRL(Math.abs(currentHover.value))}) • Faltam ${formatBRL(reserva - currentHover.value)} para atingir a reserva`
                    : `⚠️ Abaixo da reserva protegida (faltam ${formatBRL(reserva - currentHover.value)})`}
                </span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-slate-400 text-[11px]">
            Passe o mouse ou toque nos pontos do gráfico para inspecionar os valores exatos.
          </span>
        )}
      </div>
    </div>
  );
};
