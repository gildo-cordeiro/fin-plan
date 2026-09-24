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
  const H = 210;
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between h-full shadow-2xs transition-shadow duration-200">
      {/* Cabeçalho & Legenda */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 min-h-[28px]">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Renda × Despesas
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#0f7a55] inline-block"></span>
            Renda
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#c2653d] inline-block"></span>
            Cartões
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#3b6998] inline-block"></span>
            Fixas
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#c09420] inline-block"></span>
            Variáveis
          </span>
        </div>
      </div>

      {/* Gráfico SVG */}
      <div className="overflow-x-auto pb-1 my-auto">
        <div style={{ minWidth: W }} className="relative select-none">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
            {/* Linha de Base */}
            <line
              x1={padLeft}
              y1={H - padBottom}
              x2={W - padRight}
              y2={H - padBottom}
              stroke="#cbd5e1"
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
                  {/* Fundo suave na coluna em hover */}
                  {isHovered && (
                    <rect
                      x={cx - groupW / 2}
                      y={padTop}
                      width={groupW}
                      height={H - padTop - padBottom}
                      fill="currentColor"
                      className="text-slate-100/70 dark:text-slate-800/40 transition-opacity duration-200"
                      rx="4"
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
                    className="transition-all duration-150"
                  />

                  {/* Cartões */}
                  <rect
                    x={expX}
                    y={cardY}
                    width={barW}
                    height={Math.max(1, cardH)}
                    fill="#c2653d"
                    className="transition-all duration-150"
                  />

                  {/* Fixas */}
                  <rect
                    x={expX}
                    y={fixY}
                    width={barW}
                    height={Math.max(1, fixH)}
                    fill="#3b6998"
                    className="transition-all duration-150"
                  />

                  {/* Variáveis */}
                  <rect
                    x={expX}
                    y={varY}
                    width={barW}
                    height={Math.max(1, varH)}
                    rx="2"
                    fill="#c09420"
                    className="transition-all duration-150"
                  />

                  {/* Rótulo inferior do mês */}
                  <text
                    x={cx}
                    y={H - 8}
                    textAnchor="middle"
                    fontSize="10"
                    fill={isHovered ? '#0f7a55' : '#627282'}
                    fontWeight={isHovered ? '700' : '500'}
                    className="transition-colors duration-150 select-none"
                  >
                    {m.month.shortName}
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
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {currentHover.month.name}:
            </span>
            <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
              <span className="text-[#0f7a55] dark:text-[#3dd69c] font-semibold">
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
          <span className="text-slate-400 text-[11px] transition-opacity duration-200">
            Passe o mouse ou toque nas barras para discriminar as contas do mês.
          </span>
        )}
      </div>
    </div>
  );
};
