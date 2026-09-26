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

export interface FetchBudgetOptions {
  timeoutMs?: number;
  retries?: number;
}

export const budgetApiService = {
  async fetchBudget(options?: FetchBudgetOptions): Promise<{ state: BudgetState | null; updatedAt: Date | null }> {
    const timeoutMs = options?.timeoutMs ?? 45000;
    const maxRetries = options?.retries ?? 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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

        if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt < maxRetries) {
          console.warn(`[budgetApiService] Servidor iniciando (${res.status}), aguardando reconexão (${attempt + 1}/${maxRetries})...`);
          await new Promise((r) => setTimeout(r, 2500));
          continue;
        }

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

        const isAbort = err instanceof Error && err.name === 'AbortError';
        const isNetworkErr = err instanceof TypeError;

        if ((isAbort || isNetworkErr) && attempt < maxRetries) {
          console.warn(`[budgetApiService] Servidor ainda não respondeu, tentando novamente (${attempt + 1}/${maxRetries})...`);
          await new Promise((r) => setTimeout(r, 2500));
          continue;
        }

        if (isAbort) {
          throw new Error('Tempo limite esgotado ao buscar dados no MongoDB. O servidor pode estar iniciando no plano gratuito.');
        }
        throw err;
      }
    }

    throw new Error('Falha ao conectar com o servidor após múltiplas tentativas.');
  },

  async saveBudget(state: BudgetState): Promise<{ success: boolean; updatedAt: Date }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

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
        throw new Error('Tempo limite esgotado ao salvar no MongoDB (25s).');
      }
      throw err;
    }
  },
};
