import { useState } from 'react';
import { useBudget } from '../../hooks/useBudget';
import { useToast } from '../../context/ToastContext';
import { CurrencyInput } from '../ui/CurrencyInput';
import { formatBRL } from '../../utils/formatters';
import {
  useCostsQuery,
  useCreateCostMutation,
  useUpdateCostMutation,
  useDeleteCostMutation,
  useCreateCostItemMutation,
  useUpdateCostItemMutation,
  useDeleteCostItemMutation
} from '../../queries/costs';
import { useUpdateGoalMutation } from '../../queries/goals';

export const OneTimeCostsSection = () => {
  const { showToast } = useToast();
  const { state, createReserveMovement } = useBudget();
  const currentYear = state.currentYear;
  
  const updateGoalMutation = useUpdateGoalMutation();
  const { data: costs = [] } = useCostsQuery(currentYear);
  const createCostMutation = useCreateCostMutation(currentYear);
  const updateCostMutation = useUpdateCostMutation(currentYear);
  const deleteCostMutation = useDeleteCostMutation(currentYear);
  const createCostItemMutation = useCreateCostItemMutation(currentYear);
  const updateCostItemMutation = useUpdateCostItemMutation(currentYear);
  const deleteCostItemMutation = useDeleteCostItemMutation(currentYear);

  const createCost = (name: string, defaultMonth?: number | null, marginPercent?: number, notes?: string) => createCostMutation.mutateAsync({ budgetId: String(currentYear), name, defaultMonth, marginPercent, notes });
  const updateCost = (id: string, patch: any) => updateCostMutation.mutate({ id, patch });
  const removeCost = (id: string) => deleteCostMutation.mutate(id);
  const addCostItem = (costId: string, name: string, plannedAmount: number, month?: number | null) => createCostItemMutation.mutate({ costId, data: { name, plannedAmount, month } });
  const updateCostItem = (costId: string, id: string, patch: any) => updateCostItemMutation.mutate({ costId, id, patch });
  const removeCostItem = (costId: string, id: string) => deleteCostItemMutation.mutate({ costId, id });
  const confirmCostItem = (costId: string, id: string, amount: number) => updateCostItemMutation.mutate({ costId, id, patch: { actualAmount: amount } });
  const unconfirmCostItem = (costId: string, id: string) => updateCostItemMutation.mutate({ costId, id, patch: { actualAmount: null } });

  const { goals, months } = state;

  // Estado para novo projeto
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // Estado para novo item dentro de projeto: costId -> name
  const [newItemNames, setNewItemNames] = useState<Record<string, string>>({});

  // Estado para formulário de movimentação de reserva
  const [reserveMonth, setReserveMonth] = useState(() => new Date().getMonth() + 1);
  const [reserveAmount, setReserveAmount] = useState(0);
  const [reserveType, setReserveType] = useState<'aporte' | 'retirada'>('aporte');
  const [reserveReason, setReserveReason] = useState('');

  // Metas para sincronizar
  const mudGoal = goals.find(
    (g) =>
      g.name.toLowerCase().includes('mudan') ||
      g.icon === '🏠' ||
      g.icon === '🚚'
  );

  const handleCreateProject = async () => {
    const name = newProjectName.trim() || 'Novo Projeto Especial';
    await createCost(name, null, 10);
    setNewProjectName('');
    setIsCreatingProject(false);
    showToast(`Projeto "${name}" criado com sucesso!`, { type: 'success' });
  };

  const handleAddCostItem = async (costId: string) => {
    const itemName = (newItemNames[costId] || '').trim() || 'Novo Item';
    await addCostItem(costId, itemName, 0, null);
    setNewItemNames((prev) => ({ ...prev, [costId]: '' }));
  };

  const handleSyncWithGoal = (totalWithMargin: number) => {
    if (mudGoal) {
      updateGoalMutation.mutate({ id: mudGoal.id, patch: { targetAmount: Math.round(totalWithMargin) } });
      showToast(`Meta "${mudGoal.name}" atualizada para ${formatBRL(totalWithMargin)}!`, { type: 'success' });
    }
  };

  const handleAddReserveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reserveAmount <= 0) {
      showToast('Informe um valor maior que zero.', { type: 'error' });
      return;
    }
    const finalAmount = reserveType === 'retirada' ? -reserveAmount : reserveAmount;
    await createReserveMovement(reserveMonth, finalAmount, reserveReason.trim() || undefined);
    setReserveAmount(0);
    setReserveReason('');
    showToast('Movimentação da reserva registrada com sucesso!', { type: 'success' });
  };

  return (
    <div className="space-y-6">
      {/* SEÇÃO PRINCIPAL DE PROJETOS E CUSTOS PONTUAIS */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🚚</span>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Custos Pontuais e Projetos Especiais
              </h2>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Gastos não recorrentes organizados por projetos (ex: Mudança, Reforma, Casamento, Viagem).
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreatingProject(true)}
            className="text-xs px-3 py-1.5 rounded-xl border border-[#0e6b7a]/40 bg-[#0e6b7a]/5 text-[#0e6b7a] dark:text-[#4ec2d3] hover:bg-[#0e6b7a]/15 font-semibold transition-colors cursor-pointer"
          >
            + Novo Projeto
          </button>
        </div>

        {/* Modal/Input para criar novo projeto */}
        {isCreatingProject && (
          <div className="p-3 bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-xl flex flex-wrap items-center gap-2">
            <input
              type="text"
              autoFocus
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Nome do projeto (ex: Mudança para Novo Apartamento)"
              className="flex-1 min-w-[200px] text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
            />
            <button
              type="button"
              onClick={handleCreateProject}
              className="px-3 py-1.5 text-xs font-bold bg-[#0e6b7a] hover:bg-[#09525e] text-white rounded-lg cursor-pointer"
            >
              Criar Projeto
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingProject(false)}
              className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Lista de Projetos (Cost) */}
        {costs.length === 0 && !isCreatingProject ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500 space-y-2">
            <span className="text-3xl block">📦</span>
            <p className="text-xs font-medium">Nenhum projeto de custo pontual cadastrado.</p>
            <button
              type="button"
              onClick={() => {
                createCost('Mudança de Residência', 12, 10, 'Custos pontuais da transição de apartamento');
              }}
              className="px-3 py-1.5 text-xs font-bold bg-[#0e6b7a] hover:bg-[#09525e] text-white rounded-xl shadow-xs cursor-pointer"
            >
              + Criar Projeto Inicial: Mudança
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {costs.map((cost) => {
              const items = cost.items || [];
              const rawTotal = items.reduce((acc, i) => acc + (i.plannedAmount || 0), 0);
              const totalWithMargin = rawTotal * (1 + cost.marginPercent / 100);

              const defaultMonthName = cost.defaultMonth
                ? months.find((m) => m.monthIndex + 1 === cost.defaultMonth)?.name || `Mês ${cost.defaultMonth}`
                : null;

              return (
                <div
                  key={cost.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden"
                >
                  {/* Cabeçalho do Projeto */}
                  <div className="p-3.5 bg-gradient-to-r from-purple-500/10 via-transparent to-transparent border-b border-slate-200/80 dark:border-slate-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                        <span className="text-lg">📁</span>
                        <input
                          type="text"
                          value={cost.name}
                          onChange={(e) => updateCost(cost.id, { name: e.target.value })}
                          className="text-sm font-bold text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-[#0e6b7a] outline-none px-1"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeCost(cost.id)}
                        className="text-xs text-slate-400 hover:text-rose-500 px-2 py-1 rounded transition-colors cursor-pointer"
                        title="Excluir projeto e todos os seus itens"
                      >
                        Excluir projeto ✕
                      </button>
                    </div>

                    {/* Controles de Mês Padrão e Margem */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="text-slate-500 dark:text-slate-400 font-medium">
                          Mês Padrão:
                        </label>
                        <select
                          value={cost.defaultMonth ?? ''}
                          onChange={(e) =>
                            updateCost(cost.id, {
                              defaultMonth: e.target.value ? parseInt(e.target.value, 10) : null,
                            })
                          }
                          className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer outline-none"
                        >
                          <option value="">Sem mês fixo (deduz no saldo final)</option>
                          {months.map((m) => (
                            <option key={m.id} value={m.monthIndex + 1}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-slate-500 dark:text-slate-400 font-medium">
                          Margem de Imprevistos:
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={cost.marginPercent}
                            onChange={(e) =>
                              updateCost(cost.id, { marginPercent: parseFloat(e.target.value) || 0 })
                            }
                            className="w-16 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-slate-800 dark:text-slate-200 outline-none"
                          />
                          <span className="text-slate-500 font-bold">%</span>
                        </div>
                      </div>
                    </div>

                    {/* Resumo do Projeto */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Soma dos Itens:</span>
                        <strong className="font-mono text-slate-800 dark:text-slate-100 text-sm">
                          {formatBRL(rawTotal)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">
                          Com Margem (+{cost.marginPercent}%):
                        </span>
                        <strong className="font-mono text-purple-700 dark:text-purple-300 text-sm">
                          {formatBRL(totalWithMargin)}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Agendamento:</span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                            {defaultMonthName ? defaultMonthName : 'Saldo final do ano'}
                          </span>
                        </div>
                        {mudGoal && (
                          <button
                            type="button"
                            onClick={() => handleSyncWithGoal(totalWithMargin)}
                            className="text-[10px] font-bold text-[#0e6b7a] dark:text-[#4ec2d3] underline cursor-pointer"
                            title="Sincronizar valor alvo com a Meta"
                          >
                            Sincronizar Meta
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tabela de Itens do Projeto */}
                  <div className="p-3 space-y-1.5">
                    {items.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-slate-500 py-2 text-center">
                        Nenhum item cadastrado neste projeto ainda.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {items.map((item) => {
                          const isConfirmed = Boolean(item.paidDate);

                          return (
                            <div
                              key={item.id}
                              className={`flex flex-wrap sm:flex-nowrap items-center gap-2 py-2 px-1 rounded-xl transition-all ${
                                isConfirmed
                                  ? 'bg-emerald-50/30 dark:bg-emerald-950/10'
                                  : 'hover:bg-white dark:hover:bg-slate-800/40'
                              }`}
                            >
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) =>
                                  updateCostItem(cost.id, item.id, { name: e.target.value })
                                }
                                placeholder="Nome do item (ex: Pintura, Caminhão)"
                                className="flex-1 min-w-[150px] text-xs font-medium text-slate-800 dark:text-slate-200 bg-transparent border-b border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-[#0e6b7a] outline-none py-0.5 px-1 truncate"
                              />

                              {/* Mês Individual do Item */}
                              <div className="shrink-0">
                                <select
                                  value={item.month ?? ''}
                                  onChange={(e) =>
                                    updateCostItem(cost.id, item.id, {
                                      month: e.target.value ? parseInt(e.target.value, 10) : null,
                                    })
                                  }
                                  className="text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-300 cursor-pointer outline-none"
                                  title="Mês específico de pagamento deste item"
                                >
                                  <option value="">
                                    {defaultMonthName ? `Padrão (${defaultMonthName})` : 'Padrão (Saldo final)'}
                                  </option>
                                  {months.map((m) => (
                                    <option key={m.id} value={m.monthIndex + 1}>
                                      Pagar em {m.shortName}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Valor Planejado */}
                              <div className="w-28 sm:w-32 shrink-0">
                                <CurrencyInput
                                  value={item.plannedAmount}
                                  onChange={(v) =>
                                    updateCostItem(cost.id, item.id, { plannedAmount: v })
                                  }
                                  ariaLabel={`Valor de ${item.name}`}
                                />
                              </div>

                              {/* Confirmação de Pagamento */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (isConfirmed) {
                                    unconfirmCostItem(cost.id, item.id);
                                  } else {
                                    confirmCostItem(cost.id, item.id, item.plannedAmount);
                                  }
                                }}
                                className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs shrink-0 transition-all cursor-pointer ${
                                  isConfirmed
                                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-700'
                                    : 'text-slate-300 hover:text-emerald-600 dark:text-slate-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                }`}
                                title={
                                  isConfirmed
                                    ? `Pago em ${item.paidDate}. Clique para desconfirmar.`
                                    : 'Marcar como pago'
                                }
                              >
                                ✓
                              </button>

                              {/* Remover Item */}
                              <button
                                type="button"
                                onClick={() => removeCostItem(cost.id, item.id)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs shrink-0 transition-colors cursor-pointer"
                                title="Remover item"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Linha para adicionar novo item ao projeto */}
                    <div className="pt-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={newItemNames[cost.id] || ''}
                        onChange={(e) =>
                          setNewItemNames((prev) => ({ ...prev, [cost.id]: e.target.value }))
                        }
                        placeholder="+ Adicionar item (ex: Frete, Montagem, Caução)"
                        className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCostItem(cost.id)}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddCostItem(cost.id)}
                        className="text-xs px-3 py-1.5 font-bold bg-[#0e6b7a] hover:bg-[#09525e] text-white rounded-lg cursor-pointer"
                      >
                        + Adicionar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SUBSEÇÃO: MOVIMENTAÇÕES DA RESERVA DE EMERGÊNCIA (LIVRO-RAZÃO IMUTÁVEL) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🛡️</span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Movimentações da Reserva de Emergência
              </h3>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Livro-razão imutável de depósitos e retiradas da reserva protegida.
            </p>
          </div>

          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-[#0e6b7a] dark:text-[#4ec2d3] border border-teal-200 dark:border-teal-800">
            Meta: {formatBRL(state.budget?.emergencyReserveTarget ?? 0)}
          </span>
        </div>

        {/* Formulário para novo movimento */}
        <form
          onSubmit={handleAddReserveMovement}
          className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2.5 text-xs"
        >
          <span className="font-semibold text-slate-700 dark:text-slate-300 block">
            Registrar Movimentação na Reserva
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div>
              <label className="text-slate-500 dark:text-slate-400 block mb-1">Tipo:</label>
              <select
                value={reserveType}
                onChange={(e) => setReserveType(e.target.value as 'aporte' | 'retirada')}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-bold outline-none"
              >
                <option value="aporte">🟢 Aporte (+)</option>
                <option value="retirada">🔴 Retirada (−)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-500 dark:text-slate-400 block mb-1">Mês:</label>
              <select
                value={reserveMonth}
                onChange={(e) => setReserveMonth(parseInt(e.target.value, 10))}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 outline-none font-medium"
              >
                {months.map((m) => (
                  <option key={m.id} value={m.monthIndex + 1}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-500 dark:text-slate-400 block mb-1">Valor:</label>
              <CurrencyInput
                value={reserveAmount}
                onChange={setReserveAmount}
                placeholder="0,00"
                ariaLabel="Valor do movimento"
              />
            </div>

            <div>
              <label className="text-slate-500 dark:text-slate-400 block mb-1">Motivo / Nota:</label>
              <input
                type="text"
                value={reserveReason}
                onChange={(e) => setReserveReason(e.target.value)}
                placeholder="Ex: Cobertura de imprevisto"
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              ℹ️ Histórico imutável: para corrigir um lançamento errado, registre um novo movimento de sinal oposto.
            </span>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold bg-[#0e6b7a] hover:bg-[#09525e] text-white rounded-lg shadow-xs cursor-pointer"
            >
              Registrar Movimento
            </button>
          </div>
        </form>

        {/* Histórico de Movimentos */}
        {state.reserveMovements && state.reserveMovements.length > 0 ? (
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Histórico Registrado
            </span>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {state.reserveMovements.map((m) => {
                const isPositive = m.amount > 0;
                const monthName = months.find((mo) => mo.monthIndex + 1 === m.month)?.shortName || `Mês ${m.month}`;

                return (
                  <div key={m.id} className="flex items-center justify-between py-1.5 px-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400 text-[11px]">{monthName}</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {m.reason || (isPositive ? 'Aporte na Reserva' : 'Retirada da Reserva')}
                      </span>
                    </div>
                    <strong
                      className={`font-mono tabular-nums ${
                        isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isPositive ? `+ ${formatBRL(m.amount)}` : `- ${formatBRL(Math.abs(m.amount))}`}
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-2">
            Nenhuma movimentação manual registrada na reserva neste ano.
          </p>
        )}
      </section>
    </div>
  );
};
