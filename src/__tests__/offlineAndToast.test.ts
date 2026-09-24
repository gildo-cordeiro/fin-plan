import { describe, it, expect, beforeEach } from 'vitest';
import {
  savePendingPatches,
  loadPendingPatches,
  clearPendingPatches,
} from '../services/storageService';
import { StorageKey } from '../constants/enums';

// Mock do localStorage para Node/Vitest
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

describe('Offline-First Persistence & Storage', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('salva patches pendentes no localStorage quando offline', () => {
    const patches: Array<[string, Record<string, unknown>]> = [
      ['despesa:fixas:aluguel:2026-03', { valor: 2500 }],
      ['cfg:saldo_inicial', { valor: 15000 }],
    ];

    savePendingPatches(patches);

    const stored = localStorageMock.getItem(StorageKey.PendingPatches);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(2);
    expect(parsed[0][0]).toBe('despesa:fixas:aluguel:2026-03');
    expect(parsed[0][1]).toEqual({ valor: 2500 });
  });

  it('recupera corretamente os patches acumulados na inicialização', () => {
    const patches: Array<[string, Record<string, unknown>]> = [
      ['renda:salario:2026-04', { valor: 8500 }],
    ];
    savePendingPatches(patches);

    const loaded = loadPendingPatches();
    expect(loaded).toHaveLength(1);
    expect(loaded[0][0]).toBe('renda:salario:2026-04');
    expect(loaded[0][1]).toEqual({ valor: 8500 });
  });

  it('retorna array vazio quando não há patches pendentes no localStorage', () => {
    const loaded = loadPendingPatches();
    expect(loaded).toEqual([]);
  });

  it('limpa os patches pendentes com clearPendingPatches', () => {
    savePendingPatches([['meta:carro', { valor: 50000 }]]);
    expect(loadPendingPatches()).toHaveLength(1);

    clearPendingPatches();
    expect(loadPendingPatches()).toHaveLength(0);
    expect(localStorageMock.getItem(StorageKey.PendingPatches)).toBeNull();
  });

  it('limpa o localStorage quando array de patches for vazio em savePendingPatches', () => {
    savePendingPatches([['item-1', { valor: 100 }]]);
    expect(localStorageMock.getItem(StorageKey.PendingPatches)).not.toBeNull();

    savePendingPatches([]);
    expect(localStorageMock.getItem(StorageKey.PendingPatches)).toBeNull();
  });
});
