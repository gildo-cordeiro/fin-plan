import type {
  BudgetState,
  BudgetItem,
  ExpenseCategoryKey,
  FinancialGoal,
  SimulationSettings,
  MonthItem,
} from '../types/budget';
import {
  SheetRowType as RowType,
  ItemStatus,
  GoalStatus,
  SheetConfigId,
  StorageKey,
} from '../constants/enums';
import { INITIAL_MONTHS } from '../constants/seedData';
import { createMonthItem } from '../utils/formatters';
import { SheetIdGenerator } from '../utils/idGenerator';

export const SHEETDB_STORAGE_KEY = StorageKey.SheetUrl;

export interface SheetRowRecord {
  id: string;
  tipo: 'renda' | 'despesa' | 'mudanca' | 'meta' | 'config' | string;
  categoria: string;
  nome: string;
  mes_referencia: string;
  valor: number | string;
  status: string;
  observacao?: string;
}

/**
 * Converte linhas vindas do Google Sheets (formato banco relacional)
 * de volta para a estrutura completa de estado do FinPlan (BudgetState).
 * Suporta identificadores semânticos padronizados e identificadores legados.
 */
export function rowsToBudgetState(rows: SheetRowRecord[]): BudgetState {
  const monthIdSet = new Set<string>();
  const monthRegex = /^\d{4}-\d{2}$/;

  // 1. Identifica todos os meses presentes na planilha
  rows.forEach((r) => {
    const ref = r.mes_referencia ? String(r.mes_referencia).trim() : '';
    if (monthRegex.test(ref)) {
      monthIdSet.add(ref);
    }
  });

  const sortedMonthIds = Array.from(monthIdSet).sort();
  let months: MonthItem[];
  if (sortedMonthIds.length > 0) {
    months = sortedMonthIds.map((mId) => {
      const parts = mId.split('-');
      const year = parseInt(parts[0], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      return createMonthItem(year, monthIdx);
    });
  } else {
    months = INITIAL_MONTHS;
  }

  // 2. Estrutura inicial
  const simulation: SimulationSettings = {
    varsPercent: 0,
    rendaPercent: 0,
    oneTimeMarginPercent: 0,
    initialBalance: 0,
    emergencyReserve: 0,
  };

  const incomesMap = new Map<string, BudgetItem>();
  const cartoesMap = new Map<string, BudgetItem>();
  const fixasMap = new Map<string, BudgetItem>();
  const varsMap = new Map<string, BudgetItem>();
  const mudMap = new Map<string, BudgetItem>();
  const goalsMap = new Map<string, FinancialGoal>();

  for (const row of rows) {
    const rawVal = typeof row.valor === 'string' ? parseFloat(row.valor.replace(',', '.')) : row.valor;
    const val = isNaN(rawVal) ? 0 : rawVal;
    const isInactive = String(row.status || '').toLowerCase() === ItemStatus.Inativo;
    const refMonth = row.mes_referencia ? String(row.mes_referencia).trim() : '';
    const tipo = String(row.tipo || '').toLowerCase();
    const categoria = String(row.categoria || '').toLowerCase();
    const nome = String(row.nome || '').trim();
    const rowId = String(row.id || '').trim();

    // Linha de Configuração do Sistema (semântica ou legada)
    if (tipo === RowType.Config || categoria === RowType.Config || rowId.startsWith('cfg:') || rowId.startsWith('config_')) {
      if (
        rowId === SheetConfigId.InitialBalance ||
        rowId === 'config_simulation_initialBalance' ||
        nome.toLowerCase().includes('saldo inicial')
      ) {
        simulation.initialBalance = val;
      } else if (
        rowId === SheetConfigId.EmergencyReserve ||
        rowId === 'config_simulation_emergencyReserve' ||
        nome.toLowerCase().includes('reserva')
      ) {
        simulation.emergencyReserve = val;
      } else if (rowId.includes('varspercent')) {
        simulation.varsPercent = val;
      }
      continue;
    }

    // Renda
    if (tipo === RowType.Renda || categoria === RowType.Renda) {
      const baseKey = SheetIdGenerator.extractBaseKey(rowId, refMonth, nome);
      if (!incomesMap.has(baseKey)) {
        incomesMap.set(baseKey, {
          id: baseKey,
          name: nome,
          category: 'renda',
          off: isInactive,
          values: {},
        });
      }
      const item = incomesMap.get(baseKey)!;
      if (refMonth) item.values[refMonth] = val;
      if (isInactive) item.off = true;
      continue;
    }

    // Custos da Mudança / Pontuais (Deduplicados por ID ou Nome)
    if (tipo === RowType.Mudanca || categoria === 'mud') {
      const mudId = rowId || SheetIdGenerator.oneTime(nome);
      mudMap.set(mudId, {
        id: mudId,
        name: nome,
        category: 'mud',
        isOneTime: true,
        oneTimeValue: val,
        targetMonthId: refMonth && refMonth !== 'geral' ? refMonth : undefined,
        off: isInactive,
        values: {},
      });
      continue;
    }

    // Metas (Deduplicadas por ID ou Nome)
    if (tipo === RowType.Meta || categoria === 'metas') {
      const obs = row.observacao || '';
      const emojiMatch = obs.match(/^([\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|\S+)\s*(.*)$/);
      const icon = emojiMatch ? emojiMatch[1] : '🎯';
      const description = emojiMatch ? emojiMatch[2] : obs;
      const goalId = rowId || SheetIdGenerator.goal(nome);

      goalsMap.set(goalId, {
        id: goalId,
        name: nome,
        description,
        icon,
        color: '#0e6b7a',
        targetAmount: val,
        status: (row.status as GoalStatus) || GoalStatus.Ativa,
        contributions: [],
      });
      continue;
    }

    // Despesas Recorrentes (Cartões, Fixas, Variáveis)
    if (tipo === RowType.Despesa || ['cartoes', 'fixas', 'vars'].includes(categoria)) {
      const cat: ExpenseCategoryKey =
        categoria === 'cartoes' ? 'cartoes' : categoria === 'vars' ? 'vars' : 'fixas';
      const targetMap = cat === 'cartoes' ? cartoesMap : cat === 'vars' ? varsMap : fixasMap;
      const baseKey = SheetIdGenerator.extractBaseKey(rowId, refMonth, nome);

      if (!targetMap.has(baseKey)) {
        targetMap.set(baseKey, {
          id: baseKey,
          name: nome,
          category: cat,
          off: isInactive,
          values: {},
        });
      }
      const item = targetMap.get(baseKey)!;
      if (refMonth) item.values[refMonth] = val;
      if (isInactive) item.off = true;
    }
  }

  // Preenche meses vazios com 0 em cada item
  const fillMonths = (items: BudgetItem[]): BudgetItem[] => {
    return items.map((it) => {
      const vals = { ...it.values };
      months.forEach((m) => {
        if (vals[m.id] === undefined) {
          vals[m.id] = 0;
        }
      });
      return { ...it, values: vals };
    });
  };

  return {
    version: 4,
    months,
    simulation,
    incomes: fillMonths(Array.from(incomesMap.values())),
    lists: {
      cartoes: fillMonths(Array.from(cartoesMap.values())),
      fixas: fillMonths(Array.from(fixasMap.values())),
      vars: fillMonths(Array.from(varsMap.values())),
      mud: Array.from(mudMap.values()),
    },
    goals: Array.from(goalsMap.values()),
  };
}

export const sheetService = {
  getApiUrl(): string {
    if (typeof window === 'undefined') return '';
    const envVal = import.meta.env?.VITE_SHEET_API_URL || '';
    const localVal = localStorage.getItem(SHEETDB_STORAGE_KEY) || '';
    return localVal.trim() || envVal.trim();
  },

  setApiUrl(url: string): void {
    if (typeof window === 'undefined') return;
    const trimmed = url.trim();
    if (trimmed) {
      localStorage.setItem(SHEETDB_STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(SHEETDB_STORAGE_KEY);
    }
  },

  async testConnection(url?: string): Promise<{ ok: boolean; message: string }> {
    const targetUrl = url || this.getApiUrl();
    if (!targetUrl) {
      return { ok: false, message: 'URL da API não fornecida.' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${targetUrl.replace(/\/$/, '')}?limit=1`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return { ok: false, message: `Erro ao conectar: status ${res.status}` };
      }

      return { ok: true, message: 'Conexão com a planilha bem-sucedida!' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na requisição';
      return { ok: false, message: `Não foi possível conectar: ${msg}` };
    }
  },

  /**
   * Converte o estado atual do aplicativo em linhas relacionais com IDs padronizados
   */
  exportStateToRows(state: BudgetState): SheetRowRecord[] {
    const rows: SheetRowRecord[] = [];

    // 1. Configurações de Simulação com IDs padronizados
    rows.push({
      id: SheetIdGenerator.config('initialBalance'),
      tipo: RowType.Config,
      categoria: RowType.Config,
      nome: 'Saldo Inicial',
      mes_referencia: 'geral',
      valor: state.simulation.initialBalance,
      status: ItemStatus.Ativo,
      observacao: 'Configuração do App',
    });

    rows.push({
      id: SheetIdGenerator.config('emergencyReserve'),
      tipo: RowType.Config,
      categoria: RowType.Config,
      nome: 'Reserva de Emergência',
      mes_referencia: 'geral',
      valor: state.simulation.emergencyReserve,
      status: ItemStatus.Ativo,
      observacao: 'Configuração do App',
    });

    // 2. Rendas com IDs semânticos
    state.incomes.forEach((item) => {
      state.months.forEach((m) => {
        rows.push({
          id: SheetIdGenerator.income(item.name, m.id),
          tipo: RowType.Renda,
          categoria: RowType.Renda,
          nome: item.name,
          mes_referencia: m.id,
          valor: item.values[m.id] ?? 0,
          status: item.off ? ItemStatus.Inativo : ItemStatus.Ativo,
          observacao: 'Renda mensal',
        });
      });
    });

    // 3. Despesas regulares (cartoes, fixas, vars) com IDs semânticos
    const catKeys: (keyof typeof state.lists)[] = ['cartoes', 'fixas', 'vars'];
    catKeys.forEach((catKey) => {
      state.lists[catKey].forEach((item) => {
        state.months.forEach((m) => {
          rows.push({
            id: SheetIdGenerator.expense(catKey as ExpenseCategoryKey, item.name, m.id),
            tipo: RowType.Despesa,
            categoria: catKey,
            nome: item.name,
            mes_referencia: m.id,
            valor: item.values[m.id] ?? 0,
            status: item.off ? ItemStatus.Inativo : ItemStatus.Ativo,
            observacao:
              catKey === 'cartoes'
                ? 'Fatura'
                : catKey === 'fixas'
                ? 'Conta fixa'
                : 'Gasto variável',
          });
        });
      });
    });

    // 4. Custos pontuais da Mudança com IDs semânticos
    state.lists.mud.forEach((item) => {
      rows.push({
        id: SheetIdGenerator.oneTime(item.name),
        tipo: RowType.Mudanca,
        categoria: 'mud',
        nome: item.name,
        mes_referencia: item.targetMonthId || '2026-12',
        valor: item.oneTimeValue ?? 0,
        status: item.off ? ItemStatus.Inativo : ItemStatus.Ativo,
        observacao: 'Custo pontual da mudança',
      });
    });

    // 5. Metas com IDs semânticos
    state.goals.forEach((goal) => {
      rows.push({
        id: SheetIdGenerator.goal(goal.name),
        tipo: RowType.Meta,
        categoria: 'metas',
        nome: goal.name,
        mes_referencia: 'geral',
        valor: goal.targetAmount,
        status: goal.status,
        observacao: `${goal.icon || '🎯'} ${goal.description || ''}`,
      });
    });

    return rows;
  },

  /**
   * Busca e carrega os dados diretamente do Google Sheets como banco de dados principal
   */
  async fetchFromSheet(url?: string): Promise<{ state: BudgetState; count: number }> {
    const targetUrl = url || this.getApiUrl();
    if (!targetUrl) throw new Error('Configure a URL da API da planilha para carregar os dados.');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(targetUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Falha ao obter dados da planilha: status ${res.status}`);
      }

      const json = await res.json();
      const rows: SheetRowRecord[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
        ? json.data
        : [];

      if (rows.length === 0) {
        throw new Error('A planilha está vazia ou sem dados estruturados.');
      }

      const state = rowsToBudgetState(rows);
      return { state, count: rows.length };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Tempo limite esgotado ao buscar dados na planilha (12s). Verifique sua conexão.');
      }
      throw err;
    }
  },

  /**
   * Atualiza uma linha existente na planilha diretamente pelo seu ID (PATCH).
   * Mantém o registro no mesmo lugar e não adiciona novas linhas.
   */
  async updateRow(
    id: string,
    patch: Partial<SheetRowRecord>,
    fallbackFullRow?: SheetRowRecord
  ): Promise<{ updated: number }> {
    const url = this.getApiUrl();
    if (!url) throw new Error('Configure a URL da API da planilha.');

    const cleanUrl = url.replace(/\/$/, '');
    const targetUrl = `${cleanUrl}/id/${encodeURIComponent(id)}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(targetUrl, {
        method: 'PATCH',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: patch }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Se a linha ainda não existe na planilha (404) e temos o registro de fallback, insere como nova
      if (res.status === 404 && fallbackFullRow) {
        await this.insertRow(fallbackFullRow);
        return { updated: 1 };
      }

      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        throw new Error(errorJson?.error || `Erro ao atualizar na planilha: status ${res.status}`);
      }

      const json = await res.json().catch(() => ({ updated: 1 }));
      return { updated: json.updated ?? 1 };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Tempo limite ao atualizar registro na planilha (10s).');
      }
      throw err;
    }
  },

  /**
   * Insere uma nova linha na planilha (POST)
   */
  async insertRow(row: SheetRowRecord): Promise<{ created: number }> {
    return this.insertRows([row]);
  },

  /**
   * Insere múltiplas linhas novas na planilha sem duplicar linhas existentes (POST)
   */
  async insertRows(rows: SheetRowRecord[]): Promise<{ created: number }> {
    if (rows.length === 0) return { created: 0 };
    const url = this.getApiUrl();
    if (!url) throw new Error('Configure a URL da API da planilha.');

    const cleanUrl = url.replace(/\/$/, '');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(cleanUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: rows }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        throw new Error(errorJson?.error || `Erro ao inserir na planilha: status ${res.status}`);
      }

      const json = await res.json().catch(() => ({ created: rows.length }));
      return { created: json.created ?? rows.length };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Tempo limite ao inserir registros na planilha (12s).');
      }
      throw err;
    }
  },

  /**
   * Remove uma linha da planilha pelo seu ID (DELETE)
   */
  async deleteRow(id: string): Promise<{ deleted: number }> {
    const url = this.getApiUrl();
    if (!url) throw new Error('Configure a URL da API da planilha.');

    const cleanUrl = url.replace(/\/$/, '');
    const targetUrl = `${cleanUrl}/id/${encodeURIComponent(id)}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(targetUrl, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok && res.status !== 404) {
        const errorJson = await res.json().catch(() => null);
        throw new Error(errorJson?.error || `Erro ao excluir na planilha: status ${res.status}`);
      }

      const json = await res.json().catch(() => ({ deleted: 0 }));
      return { deleted: json.deleted ?? 0 };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Tempo limite ao excluir registro na planilha (10s).');
      }
      throw err;
    }
  },

  /**
   * Remove linhas duplicadas idênticas
   */
  async deleteDuplicates(): Promise<{ duplicates: number }> {
    const url = this.getApiUrl();
    if (!url) return { duplicates: 0 };
    const cleanUrl = url.replace(/\/$/, '');
    try {
      const res = await fetch(`${cleanUrl}/duplicates`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) return { duplicates: 0 };
      const json = await res.json();
      return { duplicates: json.duplicates ?? 0 };
    } catch {
      return { duplicates: 0 };
    }
  },

  /**
   * Salva e sincroniza o estado do app diretamente na Planilha Google.
   * Em APIs como SheetDB, limpa os dados antigos previamente (DELETE /all, preservando
   * os cabeçalhos da linha 1) para garantir sobrescrita limpa sem criar linhas duplicadas.
   */
  async uploadToSheet(state: BudgetState): Promise<{ success: boolean; count: number }> {
    const url = this.getApiUrl();
    if (!url) throw new Error('Configure a URL da API da planilha antes de sincronizar.');

    const rows = this.exportStateToRows(state);
    const cleanUrl = url.replace(/\/$/, '');
    const isGoogleScript = cleanUrl.includes('script.google.com');

    // 1. Google Apps Script personalizado (aceita overwrite no corpo)
    if (isGoogleScript) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(cleanUrl, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ mode: 'overwrite', data: rows }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorJson = await response.json().catch(() => null);
          throw new Error(errorJson?.error || `status ${response.status}`);
        }
        return { success: true, count: rows.length };
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          throw new Error('Tempo limite de salvamento na planilha esgotado (15s).');
        }
        throw err;
      }
    }

    // 2. SheetDB / REST API: limpa linhas anteriores (DELETE /all) para evitar duplicação
    try {
      const clearCtrl = new AbortController();
      const clearTimeoutId = setTimeout(() => clearCtrl.abort(), 12000);
      await fetch(`${cleanUrl}/all`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' },
        signal: clearCtrl.signal,
      });
      clearTimeout(clearTimeoutId);
    } catch (clearErr) {
      console.warn('[sheetService] Aviso ao limpar linhas anteriores antes do upload:', clearErr);
    }

    // 3. Insere a lista limpa e consolidada de registros
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(cleanUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: rows }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorJson = await response.json().catch(() => null);
        const detail = errorJson?.error || `status ${response.status}`;
        if (typeof detail === 'string' && detail.includes('could not find data matching')) {
          throw new Error('A planilha precisa dos cabeçalhos na linha 1. Importe o arquivo CSV ou insira as colunas.');
        }
        throw new Error(`Erro na API: ${detail}`);
      }

      return { success: true, count: rows.length };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Tempo limite de salvamento na planilha esgotado (15s).');
      }
      throw err;
    }
  },

  /**
   * Gera o download do arquivo CSV diretamente para o computador do usuário
   */
  downloadDatabaseCsv(state: BudgetState): void {
    const rows = this.exportStateToRows(state);
    const headers = [
      'id',
      'tipo',
      'categoria',
      'nome',
      'mes_referencia',
      'valor',
      'status',
      'observacao',
    ];
    const csvContent = [
      headers.join(','),
      ...rows.map((r) =>
        [
          r.id,
          r.tipo,
          r.categoria,
          `"${r.nome.replace(/"/g, '""')}"`,
          r.mes_referencia,
          r.valor,
          r.status,
          `"${(r.observacao || '').replace(/"/g, '""')}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planilha_google_sheets_finplan.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
