import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  sheetService,
  rowsToBudgetState,
  SheetRowRecord,
  SHEETDB_STORAGE_KEY,
} from '../services/sheetService';
import type { BudgetState } from '../types/budget';
import { SheetConfigId, ItemStatus, GoalStatus } from '../constants/enums';

// Mock do localStorage para ambiente Node no Vitest
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});
Object.defineProperty(globalThis, 'window', {
  value: { localStorage: localStorageMock },
  writable: true,
});

describe('sheetService', () => {
  const mockState: BudgetState = {
    version: 4,
    months: [
      { id: '2026-10', name: 'Outubro 2026', shortName: 'Out/26', year: 2026, monthIndex: 9 },
      { id: '2026-11', name: 'Novembro 2026', shortName: 'Nov/26', year: 2026, monthIndex: 10 },
    ],
    simulation: {
      varsPercent: 0,
      rendaPercent: 0,
      oneTimeMarginPercent: 0,
      initialBalance: 5000,
      emergencyReserve: 3000,
    },
    incomes: [
      {
        id: 'renda:salario',
        name: 'Salário Mensal',
        category: 'renda',
        values: { '2026-10': 8000, '2026-11': 8000 },
      },
    ],
    lists: {
      cartoes: [
        {
          id: 'despesa:cartoes:itau',
          name: 'Cartão Itaú',
          category: 'cartoes',
          values: { '2026-10': 1500, '2026-11': 1200 },
        },
      ],
      fixas: [
        {
          id: 'despesa:fixas:aluguel',
          name: 'Aluguel',
          category: 'fixas',
          values: { '2026-10': 2000, '2026-11': 2000 },
        },
      ],
      vars: [
        {
          id: 'despesa:vars:mercado',
          name: 'Mercado',
          category: 'vars',
          off: true,
          values: { '2026-10': 600, '2026-11': 600 },
        },
      ],
      mud: [
        {
          id: 'mudanca:frete',
          name: 'Frete e Caminhão',
          category: 'mud',
          isOneTime: true,
          oneTimeValue: 1200,
          targetMonthId: '2026-11',
          values: {},
        },
      ],
    },
    goals: [
      {
        id: 'meta:reserva_de_emergencia',
        name: 'Reserva de Emergência',
        description: 'Meta de proteção',
        icon: '🛡️',
        color: '#0e6b7a',
        targetAmount: 10000,
        status: GoalStatus.Ativa,
        contributions: [],
      },
    ],
  };

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('exportStateToRows', () => {
    it('converte o estado completo para linhas relacionais com IDs padronizados', () => {
      const rows = sheetService.exportStateToRows(mockState);

      // Deve conter configurações
      const saldoRow = rows.find((r) => r.id === SheetConfigId.InitialBalance);
      expect(saldoRow).toBeDefined();
      expect(saldoRow?.valor).toBe(5000);
      expect(saldoRow?.tipo).toBe('config');

      const reservaRow = rows.find((r) => r.id === SheetConfigId.EmergencyReserve);
      expect(reservaRow).toBeDefined();
      expect(reservaRow?.valor).toBe(3000);

      // Deve conter renda para cada mês
      const rendaOut = rows.find((r) => r.id === 'renda:salario_mensal:2026-10');
      expect(rendaOut).toBeDefined();
      expect(rendaOut?.valor).toBe(8000);

      // Deve conter despesas regulares
      const itauOut = rows.find((r) => r.id === 'despesa:cartoes:cartao_itau:2026-10');
      expect(itauOut).toBeDefined();
      expect(itauOut?.valor).toBe(1500);

      const aluguelNov = rows.find((r) => r.id === 'despesa:fixas:aluguel:2026-11');
      expect(aluguelNov).toBeDefined();
      expect(aluguelNov?.valor).toBe(2000);

      // Item inativo deve ter status 'inativo'
      const mercadoRow = rows.find((r) => r.id === 'despesa:vars:mercado:2026-10');
      expect(mercadoRow).toBeDefined();
      expect(mercadoRow?.status).toBe(ItemStatus.Inativo);

      // Custo pontual da mudança
      const freteRow = rows.find((r) => r.id === 'mudanca:frete_e_caminhao');
      expect(freteRow).toBeDefined();
      expect(freteRow?.valor).toBe(1200);
      expect(freteRow?.mes_referencia).toBe('2026-11');

      // Meta
      const metaRow = rows.find((r) => r.id === 'meta:reserva_de_emergencia');
      expect(metaRow).toBeDefined();
      expect(metaRow?.valor).toBe(10000);
      expect(metaRow?.observacao).toContain('🛡️');
    });
  });

  describe('rowsToBudgetState', () => {
    it('reconstrói perfeitamente o BudgetState a partir das linhas relacionais', () => {
      const exportedRows = sheetService.exportStateToRows(mockState);
      const parsedState = rowsToBudgetState(exportedRows);

      expect(parsedState.simulation.initialBalance).toBe(5000);
      expect(parsedState.simulation.emergencyReserve).toBe(3000);
      expect(parsedState.months.length).toBe(2);
      expect(parsedState.incomes.length).toBe(1);
      expect(parsedState.incomes[0].values['2026-10']).toBe(8000);
      expect(parsedState.lists.cartoes.length).toBe(1);
      expect(parsedState.lists.cartoes[0].values['2026-10']).toBe(1500);
      expect(parsedState.lists.vars[0].off).toBe(true);
      expect(parsedState.lists.mud.length).toBe(1);
      expect(parsedState.lists.mud[0].oneTimeValue).toBe(1200);
      expect(parsedState.goals.length).toBe(1);
      expect(parsedState.goals[0].targetAmount).toBe(10000);
    });

    it('deduplica linhas se a planilha tiver registros duplicados do mesmo ID', () => {
      const duplicatedRows: SheetRowRecord[] = [
        {
          id: 'cfg:saldo_inicial',
          tipo: 'config',
          categoria: 'config',
          nome: 'Saldo Inicial',
          mes_referencia: 'geral',
          valor: 5000,
          status: 'ativo',
        },
        {
          id: 'cfg:saldo_inicial',
          tipo: 'config',
          categoria: 'config',
          nome: 'Saldo Inicial',
          mes_referencia: 'geral',
          valor: 7500, // Último valor deve prevalecer
          status: 'ativo',
        },
        {
          id: 'despesa:fixas:aluguel:2026-10',
          tipo: 'despesa',
          categoria: 'fixas',
          nome: 'Aluguel',
          mes_referencia: '2026-10',
          valor: 1500,
          status: 'ativo',
        },
        {
          id: 'despesa:fixas:aluguel:2026-10',
          tipo: 'despesa',
          categoria: 'fixas',
          nome: 'Aluguel',
          mes_referencia: '2026-10',
          valor: 1600, // Duplicado
          status: 'ativo',
        },
      ];

      const parsedState = rowsToBudgetState(duplicatedRows);

      // Não deve criar dois aluguéis nas despesas fixas
      expect(parsedState.lists.fixas.length).toBe(1);
      expect(parsedState.lists.fixas[0].name).toBe('Aluguel');
      // O saldo final deve ser o último processado
      expect(parsedState.simulation.initialBalance).toBe(7500);
    });
  });

  describe('Configuração de URL da API', () => {
    it('armazena e recupera a URL no localStorage', () => {
      sheetService.setApiUrl('https://sheetdb.io/api/v1/test_api_123');
      expect(localStorage.getItem(SHEETDB_STORAGE_KEY)).toBe('https://sheetdb.io/api/v1/test_api_123');
      expect(sheetService.getApiUrl()).toBe('https://sheetdb.io/api/v1/test_api_123');

      sheetService.setApiUrl('');
      expect(localStorage.getItem(SHEETDB_STORAGE_KEY)).toBeNull();
    });
  });

  describe('Operações de Rede (Mock)', () => {
    const testApiUrl = 'https://sheetdb.io/api/v1/mock_endpoint';

    beforeEach(() => {
      sheetService.setApiUrl(testApiUrl);
    });

    it('testConnection: retorna ok true quando conexão é bem-sucedida', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ id: 'cfg:saldo_inicial' }],
      });
      globalThis.fetch = mockFetch;

      const res = await sheetService.testConnection(testApiUrl);
      expect(res.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('mock_endpoint?limit=1'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('updateRow (PATCH): atualiza linha in-place sem criar novas linhas', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ updated: 1 }),
      });
      globalThis.fetch = mockFetch;

      const res = await sheetService.updateRow('cfg:saldo_inicial', { valor: 8500 });

      expect(res.updated).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [calledUrl, calledInit] = mockFetch.mock.calls[0];

      expect(calledUrl).toBe(`${testApiUrl}/id/cfg%3Asaldo_inicial`);
      expect(calledInit.method).toBe('PATCH');
      expect(JSON.parse(calledInit.body)).toEqual({
        data: { valor: 8500 },
      });
    });

    it('updateRow: insere automaticamente como fallback se receber 404 e tiver fallbackFullRow', async () => {
      const mockFetch = vi
        .fn()
        // Primeiro PATCH retorna 404
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({ error: 'Not found' }),
        })
        // Segundo POST (inserção) retorna 201
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({ created: 1 }),
        });
      globalThis.fetch = mockFetch;

      const fallbackRow: SheetRowRecord = {
        id: 'despesa:fixas:internet:2026-10',
        tipo: 'despesa',
        categoria: 'fixas',
        nome: 'Internet',
        mes_referencia: '2026-10',
        valor: 150,
        status: 'ativo',
      };

      const res = await sheetService.updateRow('despesa:fixas:internet:2026-10', { valor: 150 }, fallbackRow);

      expect(res.updated).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[0][1].method).toBe('PATCH');
      expect(mockFetch.mock.calls[1][1].method).toBe('POST');
    });

    it('insertRows: insere registros via POST na API', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ created: 2 }),
      });
      globalThis.fetch = mockFetch;

      const newRows: SheetRowRecord[] = [
        {
          id: 'renda:freela:2026-10',
          tipo: 'renda',
          categoria: 'renda',
          nome: 'Freela',
          mes_referencia: '2026-10',
          valor: 1000,
          status: 'ativo',
        },
      ];

      const res = await sheetService.insertRows(newRows);
      expect(res.created).toBe(2);
      expect(mockFetch).toHaveBeenCalledWith(
        testApiUrl,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ data: newRows }),
        })
      );
    });

    it('deleteRow: remove registro da planilha por ID', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ deleted: 1 }),
      });
      globalThis.fetch = mockFetch;

      const res = await sheetService.deleteRow('despesa:cartoes:itau:2026-10');
      expect(res.deleted).toBe(1);
      expect(mockFetch).toHaveBeenCalledWith(
        `${testApiUrl}/id/despesa%3Acartoes%3Aitau%3A2026-10`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('deleteDuplicates: chama endpoint /duplicates da SheetDB', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ duplicates: 3 }),
      });
      globalThis.fetch = mockFetch;

      const res = await sheetService.deleteDuplicates();
      expect(res.duplicates).toBe(3);
      expect(mockFetch).toHaveBeenCalledWith(
        `${testApiUrl}/duplicates`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('uploadToSheet (SheetDB): executa DELETE /all antes do POST para garantir sobrescrita limpa', async () => {
      const mockFetch = vi
        .fn()
        // 1. DELETE /all
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ deleted: 10 }),
        })
        // 2. POST com as novas linhas
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ created: 8 }),
        });
      globalThis.fetch = mockFetch;

      const res = await sheetService.uploadToSheet(mockState);

      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      // Chamada 1: DELETE /all
      expect(mockFetch.mock.calls[0][0]).toBe(`${testApiUrl}/all`);
      expect(mockFetch.mock.calls[0][1].method).toBe('DELETE');
      // Chamada 2: POST /
      expect(mockFetch.mock.calls[1][0]).toBe(testApiUrl);
      expect(mockFetch.mock.calls[1][1].method).toBe('POST');
    });

    it('uploadToSheet (Google Apps Script): envia modo overwrite diretamente no payload', async () => {
      const scriptUrl = 'https://script.google.com/macros/s/xyz/exec';
      sheetService.setApiUrl(scriptUrl);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      globalThis.fetch = mockFetch;

      const res = await sheetService.uploadToSheet(mockState);

      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, init] = mockFetch.mock.calls[0];
      const parsedBody = JSON.parse(init.body);
      expect(parsedBody.mode).toBe('overwrite');
      expect(Array.isArray(parsedBody.data)).toBe(true);
    });
  });
});
