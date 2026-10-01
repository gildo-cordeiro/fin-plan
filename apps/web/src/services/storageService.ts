import type { SimulationSettings } from '../types/budget';

// ---------------------------------------------------------------------------
// Schema v5 — localStorage restrito a: percentuais de simulação + UI prefs.
// Dados reais (items, entries, costs, goals) são 100% backend.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'finplan-app-data-v5';

export interface LocalSettings {
  version: 5;
  currentYear: number;
  simulation: SimulationSettings;   // varsPercent, rendaPercent, oneTimeMarginPercent
  theme: 'light' | 'dark';
}

const DEFAULT_LOCAL_SETTINGS: LocalSettings = {
  version: 5,
  currentYear: new Date().getFullYear(),
  simulation: {
    varsPercent: 0,
    rendaPercent: 0,
    oneTimeMarginPercent: 0,
  },
  theme: 'light',
};

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    return window.localStorage;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return null;
}

export function loadLocalSettings(): LocalSettings {
  const storage = getStorage();
  if (!storage) return DEFAULT_LOCAL_SETTINGS;

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as LocalSettings;
      if (data.version === 5) return data;
    }
  } catch {
    // Dados corrompidos
  }

  saveLocalSettings(DEFAULT_LOCAL_SETTINGS);
  return DEFAULT_LOCAL_SETTINGS;
}

export function saveLocalSettings(settings: LocalSettings): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('[StorageService] Falha ao salvar configurações locais:', error);
  }
}

export function updateSimulationSettings(patch: Partial<SimulationSettings>): SimulationSettings {
  const current = loadLocalSettings();
  const updated: SimulationSettings = {
    varsPercent: patch.varsPercent !== undefined ? patch.varsPercent : current.simulation.varsPercent,
    rendaPercent: patch.rendaPercent !== undefined ? patch.rendaPercent : current.simulation.rendaPercent,
    oneTimeMarginPercent: patch.oneTimeMarginPercent !== undefined ? patch.oneTimeMarginPercent : current.simulation.oneTimeMarginPercent,
  };
  saveLocalSettings({ ...current, simulation: updated });
  return updated;
}

export function saveCurrentYear(year: number): void {
  const current = loadLocalSettings();
  saveLocalSettings({ ...current, currentYear: year });
}

// ---------------------------------------------------------------------------
// Tema
// ---------------------------------------------------------------------------

export function loadTheme(): 'light' | 'dark' {
  const storage = getStorage();

  if (storage) {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw) {
        const settings = JSON.parse(raw) as LocalSettings;
        if (settings.theme) return settings.theme;
      }
    } catch {
      // ignora
    }
  }

  if (typeof window !== 'undefined' && window.matchMedia) {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }

  return 'light';
}

export function saveTheme(theme: 'light' | 'dark'): void {
  const storage = getStorage();
  if (storage) {
    try {
      const settings = loadLocalSettings();
      saveLocalSettings({ ...settings, theme });
    } catch {
      // ignora
    }
  }

  if (typeof document !== 'undefined' && document.documentElement) {
    try {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } catch (error) {
      console.error('[StorageService] Falha ao aplicar classe no tema:', error);
    }
  }
}

export function initTheme(): void {
  const current = loadTheme();
  
  if (typeof document !== 'undefined' && document.documentElement) {
    if (current === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}
