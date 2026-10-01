import { create } from 'zustand';
import { loadTheme, saveTheme, loadLocalSettings, updateSimulationSettings, saveCurrentYear } from '../services/storageService';
import type { SimulationSettings } from '../types/budget';

export interface BudgetStoreState {
  theme: 'light' | 'dark';
  currentYear: number;
  simulation: SimulationSettings;
  
  toggleTheme: () => void;
  setCurrentYear: (year: number) => void;
  updateSimulation: (patch: Partial<SimulationSettings>) => void;
}

export const useBudgetStore = create<BudgetStoreState>()((set) => {
  const local = loadLocalSettings();
  
  return {
    theme: loadTheme(),
    currentYear: local.currentYear,
    simulation: local.simulation,

    toggleTheme: () => set((state) => {
      const nextTheme = state.theme === 'light' ? 'dark' : 'light';
      saveTheme(nextTheme);
      return { theme: nextTheme };
    }),

    setCurrentYear: (year: number) => set(() => {
      saveCurrentYear(year);
      return { currentYear: year };
    }),

    updateSimulation: (patch: Partial<SimulationSettings>) => set(() => {
      const newSim = updateSimulationSettings(patch);
      return { simulation: newSim };
    }),
  };
});
