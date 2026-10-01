import { Truck, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useBudget } from '../../hooks/useBudget';
import { formatBRL } from '../../lib/format';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const currentHover = payload[0].payload;
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-3 text-xs w-64 space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {currentHover.sublabel}
          </span>
          <span
            className={`font-mono font-bold \${
              currentHover.value < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-[#0e6b7a] dark:text-[#4ec2d3]'
            }`}
          >
            {formatBRL(currentHover.value)}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          {currentHover.oneTime > 0 && (
            <span className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300">
              <Truck className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" /> Custos pontuais: <strong className="font-mono">{formatBRL(currentHover.oneTime)}</strong>
            </span>
          )}
          {currentHover.label !== 'Hoje' && (
            currentHover.needsReserveWithdrawal ? (
              <span className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 leading-snug">
                <AlertTriangle className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" /> Retirar <strong className="font-mono">{formatBRL(currentHover.withdrawalAmount)}</strong> da reserva para não negativar
              </span>
            ) : currentHover.monthBalance < 0 ? (
              <span className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-300 leading-snug">
                <Info className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" /> Gastos excederam renda ({formatBRL(Math.abs(currentHover.monthBalance))})
              </span>
            ) : (
              <span className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 leading-snug">
                <CheckCircle2 className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" /> Sobra do mês: <strong className="font-mono">{formatBRL(currentHover.monthBalance)}</strong>
              </span>
            )
          )}
        </div>
      </div>
    );
  }
  return null;
};

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  const hasDeficit = payload.needsReserveWithdrawal;
  const isNegative = payload.value < 0;

  const dotColor = isNegative
    ? '#e11d48'
    : hasDeficit
    ? '#f59e0b'
    : '#0e6b7a';

  return (
    <svg x={cx - 15} y={cy - 15} width={30} height={30} className="overflow-visible">
      {(payload.oneTime || 0) > 0 && (
        <circle cx="15" cy="15" r="8" fill="none" stroke="#9333ea" strokeWidth="1.5" strokeDasharray="2 2" />
      )}
      {hasDeficit && (
        <circle cx="15" cy="15" r="6" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.7" />
      )}
      <circle cx="15" cy="15" r="4" fill={dotColor} stroke="#ffffff" strokeWidth="1.5" />
    </svg>
  );
};

export const CashFlowChart = () => {
  const { monthlySummaries, state } = useBudget();

  const dataPoints = [
    {
      label: 'Hoje',
      sublabel: 'Saldo Inicial em Caixa',
      value: state.budget?.initialBalance ?? 0,
      income: 0,
      expenses: 0,
      monthBalance: 0,
      oneTime: 0,
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
        oneTime: m.oneTime || 0,
        needsReserveWithdrawal,
        withdrawalAmount,
      };
    }),
  ];

  const hasAnyOneTime = dataPoints.some((p) => (p.oneTime || 0) > 0);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between h-full shadow-2xs transition-shadow duration-200">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 min-h-[28px]">
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
          {hasAnyOneTime && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600 ring-2 ring-purple-300 dark:ring-purple-900 inline-block"></span>
              Custos pontuais
            </span>
          )}
        </div>
      </div>

      <div className="w-full h-[240px] -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={dataPoints}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0e6b7a" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0e6b7a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" className="dark:stroke-slate-700/50" />
            <XAxis 
              dataKey="label" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} 
              dy={10}
            />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" className="dark:stroke-slate-700" />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#0e6b7a"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorValue)"
              activeDot={{ r: 6, strokeWidth: 0, fill: '#0e6b7a' }}
              dot={<CustomDot />}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
