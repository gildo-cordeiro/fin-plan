import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadLocalSettings,
  updateSimulationSettings,
  saveCurrentYear,
  loadTheme,
  saveTheme,
} from '../services/storageService';

const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

const classListAdd = vi.fn();
const classListRemove = vi.fn();

const mockStore: Record<string, string> = {};

const mockLocalStorage = {
  getItem: vi.fn((key: string) => mockStore[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStore[key];
  }),
  clear: vi.fn(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k]);
  }),
};

Object.defineProperty(globalThis, 'window', {
  value: {
    matchMedia: mockMatchMedia,
    localStorage: mockLocalStorage,
  },
  writable: true,
});

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

Object.defineProperty(globalThis, 'document', {
  value: {
    documentElement: {
      classList: {
        add: classListAdd,
        remove: classListRemove,
      },
    },
  },
  writable: true,
});

describe('storageService v5', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
  });

  describe('loadLocalSettings and saveLocalSettings', () => {
    it('carrega settings padrão se localStorage estiver vazio', () => {
      const settings = loadLocalSettings();
      expect(settings.version).toBe(5);
      expect(settings.simulation.varsPercent).toBe(0);
      expect(settings.simulation.rendaPercent).toBe(0);
      expect(settings.simulation.oneTimeMarginPercent).toBe(0);
    });

    it('salva e atualiza percentuais de simulação', () => {
      const updated = updateSimulationSettings({ varsPercent: 15 });
      expect(updated.varsPercent).toBe(15);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('salva o ano atual selecionado', () => {
      saveCurrentYear(2027);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      const loaded = loadLocalSettings();
      expect(loaded.currentYear).toBe(2027);
    });
  });

  describe('Theme handling', () => {
    it('aplica tema dark adicionando classe dark', () => {
      saveTheme('dark');
      expect(classListAdd).toHaveBeenCalledWith('dark');
      expect(classListRemove).not.toHaveBeenCalled();
    });

    it('aplica tema light removendo classe dark', () => {
      saveTheme('light');
      expect(classListRemove).toHaveBeenCalledWith('dark');
      expect(classListAdd).not.toHaveBeenCalled();
    });

    it('loadTheme detecta preferência do sistema via matchMedia', () => {
      mockMatchMedia.mockReturnValueOnce({ matches: true });
      expect(loadTheme()).toBe('dark');

      mockMatchMedia.mockReturnValueOnce({ matches: false });
      expect(loadTheme()).toBe('light');
    });
  });
});
