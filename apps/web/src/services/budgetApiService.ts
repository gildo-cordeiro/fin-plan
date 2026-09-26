import type { BudgetState } from '../types/budget';

export interface BudgetApiResponse {
  success?: boolean;
  exists?: boolean;
  data?: BudgetState | null;
  updatedAt?: string;
  error?: string;
}

function getBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  return envUrl ? envUrl.replace(/\/$/, '') : '';
}

function getAuthHeaders(): Record<string, string> {
  const apiKey = (import.meta as any).env?.VITE_API_SECRET_KEY;
  return apiKey ? { 'x-api-key': apiKey } : {};
}

export const budgetApiService = {
  async fetchBudget(): Promise<{ state: BudgetState | null; updatedAt: Date | null }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(`${getBaseUrl()}/api/v1/budget`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...getAuthHeaders(),
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        throw new Error(errorJson?.error || `Falha ao carregar dados do MongoDB (status ${res.status})`);
      }

      const json: BudgetApiResponse = await res.json();
      if (!json.exists || !json.data) {
        return { state: null, updatedAt: null };
      }

      return {
        state: json.data,
        updatedAt: json.updatedAt ? new Date(json.updatedAt) : null,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Tempo limite esgotado ao buscar dados no MongoDB (12s).');
      }
      throw err;
    }
  },

  async saveBudget(state: BudgetState): Promise<{ success: boolean; updatedAt: Date }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(`${getBaseUrl()}/api/v1/budget`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(state),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        throw new Error(errorJson?.error || `Falha ao salvar no MongoDB (status ${res.status})`);
      }

      const json = await res.json().catch(() => null);
      const updatedAt = json?.updatedAt ? new Date(json.updatedAt) : new Date();
      return { success: true, updatedAt };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Tempo limite esgotado ao salvar no MongoDB (15s).');
      }
      throw err;
    }
  },
};
