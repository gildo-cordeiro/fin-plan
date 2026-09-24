import { ExpenseCategoryKey, SheetConfigId, SheetRowType } from '../constants/enums';

/**
 * Converte qualquer texto em um slug semântico legível (sem acentos, minúsculo, separado por underline)
 * Ex: "Cartão Itaú" -> "cartao_itau"
 * Ex: "Caução e depósito do novo imóvel" -> "caucao_e_deposito_do_novo_imovel"
 */
export function toSemanticSlug(text: string): string {
  if (!text) return 'item';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9]+/g, '_')     // substitui pontuação e espaços por underscore
    .replace(/^_+|_+$/g, '')         // remove underscores no início e fim
    .slice(0, 50);                   // limita tamanho para brevidade
}

/**
 * Geradores de IDs Semânticos e Padronizados para a Planilha Google e Banco de Dados
 */
export const SheetIdGenerator = {
  /**
   * Configurações globais
   * Ex: "cfg:saldo_inicial" ou "cfg:reserva_emergencia"
   */
  config(key: 'initialBalance' | 'emergencyReserve'): string {
    return key === 'initialBalance'
      ? SheetConfigId.InitialBalance
      : SheetConfigId.EmergencyReserve;
  },

  /**
   * Rendas mensais
   * Formato: "renda:<slug_do_nome>:<mes>"
   * Ex: "renda:salario_liquido_mensal:2026-10"
   */
  income(name: string, monthId: string): string {
    return `${SheetRowType.Renda}:${toSemanticSlug(name)}:${monthId}`;
  },

  /**
   * Despesas recorrentes (Cartões, Fixas, Variáveis)
   * Formato: "despesa:<categoria>:<slug_do_nome>:<mes>"
   * Ex: "despesa:cartoes:cartao_itau:2026-10"
   * Ex: "despesa:fixas:aluguel:2026-10"
   */
  expense(category: ExpenseCategoryKey, name: string, monthId: string): string {
    return `${SheetRowType.Despesa}:${category}:${toSemanticSlug(name)}:${monthId}`;
  },

  /**
   * Custos pontuais / Mudança
   * Formato: "mudanca:<slug_do_nome>"
   * Ex: "mudanca:frete_ou_caminhao_de_mudanca"
   */
  oneTime(name: string): string {
    return `${SheetRowType.Mudanca}:${toSemanticSlug(name)}`;
  },

  /**
   * Metas financeiras
   * Formato: "meta:<slug_do_nome>"
   * Ex: "meta:mudanca_de_residencia"
   */
  goal(name: string): string {
    return `${SheetRowType.Meta}:${toSemanticSlug(name)}`;
  },

  /**
   * Extrai o identificador base (semântico ou legado) de uma linha para agrupamento
   */
  extractBaseKey(rowId: string, refMonth: string, name: string): string {
    if (!rowId) return toSemanticSlug(name);

    // Formato semântico: "tipo:categoria:slug:mes" ou "tipo:slug:mes"
    const parts = rowId.split(':');
    if (parts.length >= 3) {
      // Se a última parte for o mês, remove para obter a chave base
      if (parts[parts.length - 1] === refMonth) {
        return parts.slice(0, -1).join(':');
      }
      return rowId;
    }

    // Formato legado: "baseId_2026-10"
    if (refMonth && rowId.endsWith(`_${refMonth}`)) {
      return rowId.slice(0, rowId.length - refMonth.length - 1);
    }

    return rowId;
  },
};
