import { create } from 'zustand';
import { loadTheme, saveTheme, loadLocalSettings, updateSimulationSettings, saveCurrentYear } from '../services/storageService';
import type { SimulationSettings } from '../types/budget';

export interface UIState {
  theme: 'light' | 'dark';
  currentYear: number;
  simulation: SimulationSettings;
  isOnline: boolean;
  
  toggleTheme: () => void;
  setCurrentYear: (year: number) => void;
  updateSimulation: (patch: Partial<SimulationSettings>) => void;
  setIsOnline: (status: boolean) => void;
}

export const useUIStore = create<UIState>((set) => {
  const local = loadLocalSettings();
  
  return {
    theme: loadTheme(),
    currentYear: local.currentYear,
    simulation: local.simulation,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,

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

    setIsOnline: (status: boolean) => set({ isOnline: status }),
  };
});
