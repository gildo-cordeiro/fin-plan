import { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { formatBRL } from '../../utils/formatters';

export const MonthlyBarChart = () => {
  const { monthlySummaries } = useBudget();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const n = monthlySummaries.length;
  if (n === 0) return null;

  const maxVal = Math.max(
    1000,
    ...monthlySummaries.map((m) => Math.max(m.income, m.cards + m.fixed + m.variable))
  );

  const W = Math.max(480, n * 55);
  const H = 200;
  const padLeft = 30;
  const padRight = 30;
  const padTop = 20;
  const padBottom = 30;

  const chartW = W - padLeft - padRight;
  const groupW = chartW / n;
  const barW = Math.min(26, groupW * 0.35);

  const getY = (val: number) => padTop + (1 - val / maxVal) * (H - padTop - padBottom);
  const getH = (val: number) => (val / maxVal) * (H - padTop - padBottom);

  const currentHover = hoveredIdx !== null ? monthlySummaries[hoveredIdx] : null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Renda e despesas
        </h3>
        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#0f7a55] inline-block"></span>
            Renda
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#c2653d] inline-block"></span>
            Cartões
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#3b6998] inline-block"></span>
            Fixas
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#c09420] inline-block"></span>
            Variáveis
          </span>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div style={{ minWidth: W }} className="relative select-none">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
            <line
              x1={padLeft}
              y1={H - padBottom}
              x2={W - padRight}
              y2={H - padBottom}
              stroke="#dbe3e9"
              className="dark:stroke-slate-700"
              strokeWidth="1"
            />

            {monthlySummaries.map((m, idx) => {
              const cx = padLeft + idx * groupW + groupW / 2;
              const isHovered = hoveredIdx === idx;

              // Barra de Renda (à esquerda)
              const incX = cx - barW - 1.5;
              const incH = getH(m.income);
              const incY = getY(m.income);

              // Barra de Despesas empilhada (à direita)
              const expX = cx + 1.5;
              const cardH = getH(m.cards);
              const fixH = getH(m.fixed);
              const varH = getH(m.variable);

              const cardY = H - padBottom - cardH;
              const fixY = cardY - fixH;
              const varY = fixY - varH;

              return (
                <g
                  key={m.month.id}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="cursor-pointer"
                >
                  {isHovered && (
                    <rect
                      x={cx - groupW / 2}
                      y={padTop}
                      width={groupW}
                      height={H - padTop - padBottom}
                      fill="currentColor"
                      className="text-slate-100 dark:text-slate-800/50"
                      rx="3"
                    />
                  )}

                  {/* Renda */}
                  <rect
                    x={incX}
                    y={incY}
                    width={barW}
                    height={Math.max(2, incH)}
                    rx="2"
                    fill="#0f7a55"
                  />

                  {/* Cartões */}
                  <rect
                    x={expX}
                    y={cardY}
                    width={barW}
                    height={Math.max(1, cardH)}
                    fill="#c2653d"
                  />

                  {/* Fixas */}
                  <rect
                    x={expX}
                    y={fixY}
                    width={barW}
                    height={Math.max(1, fixH)}
                    fill="#3b6998"
                  />

                  {/* Variáveis */}
                  <rect
                    x={expX}
                    y={varY}
                    width={barW}
                    height={Math.max(1, varH)}
                    rx="2"
                    fill="#c09420"
                  />

                  {/* Mês */}
                  <text
                    x={cx}
                    y={H - 8}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#627282"
                    fontWeight={isHovered ? '700' : '500'}
                  >
                    {m.month.shortName}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Tooltip de detalhes compacto e fixo abaixo */}
      <div className="mt-2 h-7 px-2 flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300">
        {currentHover ? (
          <div className="w-full flex items-center justify-between">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {currentHover.month.name}:
            </span>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="text-[#0f7a55] dark:text-[#3dd69c]">
                Renda: {formatBRL(currentHover.income)}
              </span>
              <span className="text-[#c2653d]">
                Cartões: {formatBRL(currentHover.cards)}
              </span>
              <span className="text-[#3b6998]">
                Fixas: {formatBRL(currentHover.fixed)}
              </span>
              <span className="text-[#c09420]">
                Var: {formatBRL(currentHover.variable)}
              </span>
            </div>
          </div>
        ) : (
          <span className="text-slate-400 text-[11px]">
            Passe o mouse ou toque nas barras para discriminar as contas do mês.
          </span>
        )}
      </div>
    </div>
  );
};
