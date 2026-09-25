import { useBudget } from '../../context/BudgetContext';
import { formatBRL } from '../../utils/formatters';

export const MonthlySummaryTable = () => {
  const { monthlySummaries, state } = useBudget();
  const { months } = state;

  const totalIncome   = monthlySummaries.reduce((acc, m) => acc + m.income, 0);
  const totalCards    = monthlySummaries.reduce((acc, m) => acc + m.cards, 0);
  const totalFixed    = monthlySummaries.reduce((acc, m) => acc + m.fixed, 0);
  const totalVars     = monthlySummaries.reduce((acc, m) => acc + m.variable, 0);
  const totalBalance  = monthlySummaries.reduce((acc, m) => acc + m.monthBalance, 0);

  const handleExportCSV = () => {
    const headers = ['', ...months.map((m) => m.shortName), 'Total'];
    const rows = [
      ['Renda',           ...monthlySummaries.map((m) => m.income.toFixed(2)),           totalIncome.toFixed(2)],
      ['Cartões',         ...monthlySummaries.map((m) => m.cards.toFixed(2)),            totalCards.toFixed(2)],
      ['Fixas',           ...monthlySummaries.map((m) => m.fixed.toFixed(2)),            totalFixed.toFixed(2)],
      ['Variáveis',       ...monthlySummaries.map((m) => m.variable.toFixed(2)),         totalVars.toFixed(2)],
      ['Sobra do mês',    ...monthlySummaries.map((m) => m.monthBalance.toFixed(2)),     totalBalance.toFixed(2)],
      ['Saldo acumulado', ...monthlySummaries.map((m) => m.accumulatedBalance.toFixed(2)), ''],
    ];

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orcamento-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  type FieldKey = 'income' | 'cards' | 'fixed' | 'variable' | 'monthBalance';

  const renderRow = (label: string, field: FieldKey, total: number) => (
    <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
      <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 py-2 px-3 text-left font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap border-r border-slate-100 dark:border-slate-800">
        {label}
      </td>
      {monthlySummaries.map((x) => (
        <td
          key={x.month.id}
          className={`py-2 px-2 text-right font-mono tabular-nums whitespace-nowrap ${
            field === 'monthBalance'
              ? x.monthBalance < 0
                ? 'text-[#c53030] dark:text-[#f87171] font-bold'
                : 'text-[#0f7a55] dark:text-[#3dd69c] font-bold'
              : 'text-slate-700 dark:text-slate-300'
          }`}
        >
          {formatBRL(x[field])}
        </td>
      ))}
      <td
        className={`sticky right-0 z-10 bg-white dark:bg-slate-900 py-2 px-3 text-right font-mono font-semibold tabular-nums whitespace-nowrap border-l border-slate-100 dark:border-slate-800 ${
          field === 'monthBalance'
            ? total < 0
              ? 'text-[#c53030] dark:text-[#f87171]'
              : 'text-[#0f7a55] dark:text-[#3dd69c]'
            : 'text-slate-800 dark:text-slate-200'
        }`}
      >
        {formatBRL(total)}
      </td>
    </tr>
  );

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Resumo mês a mês
        </h2>
        <button
          type="button"
          onClick={handleExportCSV}
          className="text-xs px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium"
        >
          Baixar planilha (CSV)
        </button>
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
        Sobra do mês = renda − cartões − fixas − variáveis.
      </p>

      <div className="overflow-x-auto pb-1">
        <table className="w-full text-xs border-collapse font-mono" style={{ minWidth: 240 + months.length * 90 }}>
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 font-sans">
              <th className="sticky left-0 z-10 bg-white dark:bg-slate-900 py-2 px-3 text-left font-semibold whitespace-nowrap border-r border-slate-100 dark:border-slate-800">
                Fluxo
              </th>
              {months.map((m) => (
                <th key={m.id} className="py-2 px-2 text-right font-semibold whitespace-nowrap">
                  {m.shortName}
                </th>
              ))}
              <th className="sticky right-0 z-10 bg-white dark:bg-slate-900 py-2 px-3 text-right font-semibold whitespace-nowrap border-l border-slate-100 dark:border-slate-800">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {renderRow('Renda',        'income',       totalIncome)}
            {renderRow('Cartões',      'cards',        totalCards)}
            {renderRow('Fixas',        'fixed',        totalFixed)}
            {renderRow('Variáveis',    'variable',     totalVars)}
            {renderRow('Sobra do mês', 'monthBalance', totalBalance)}

            <tr className="bg-[#e5f2f4]/60 dark:bg-[#102a33]/60 font-bold border-t-2 border-[#0e6b7a]/30 text-xs">
              <td className="sticky left-0 z-10 bg-[#e5f2f4] dark:bg-[#102a33] py-2.5 px-3 text-left font-sans text-[#0e6b7a] dark:text-[#4ec2d3] whitespace-nowrap border-r border-[#0e6b7a]/20">
                Saldo acumulado
              </td>
              {monthlySummaries.map((x) => (
                <td
                  key={x.month.id}
                  className={`py-2.5 px-2 text-right font-mono tabular-nums whitespace-nowrap ${
                    x.accumulatedBalance < 0
                      ? 'text-[#c53030] dark:text-[#f87171]'
                      : 'text-[#0e6b7a] dark:text-[#4ec2d3]'
                  }`}
                >
                  {formatBRL(x.accumulatedBalance)}
                </td>
              ))}
              <td className="sticky right-0 z-10 bg-[#e5f2f4] dark:bg-[#102a33] py-2.5 px-3 text-right font-mono tabular-nums text-slate-500 border-l border-[#0e6b7a]/20">
                —
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
};
