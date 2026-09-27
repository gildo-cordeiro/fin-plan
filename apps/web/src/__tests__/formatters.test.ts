import { describe, it, expect } from 'vitest';
import {
  formatBRL,
  formatCompactBRL,
  formatPercent,
  formatDecimalBR,
  parseDecimalBR,
  createMonthItem,
  generateMonthSequence,
  getCurrentMonthId,
  getDefaultActiveMonthId,
} from '../utils/formatters';

describe('formatters', () => {
  describe('formatBRL', () => {
    it('formats positive currency correctly in pt-BR', () => {
      const result = formatBRL(1234.56);
      expect(result).toContain('1.234,56');
    });

    it('formats negative currency with minus sign', () => {
      const result = formatBRL(-500.2);
      expect(result).toContain('- ');
      expect(result).toContain('500,20');
    });

    it('handles NaN gracefully', () => {
      expect(formatBRL(NaN)).toContain('0,00');
    });
  });

  describe('formatDecimalBR', () => {
    it('formats decimal numbers with 2 decimal places and pt-BR separators', () => {
      expect(formatDecimalBR(1155.73)).toBe('1.155,73');
      expect(formatDecimalBR(2500)).toBe('2.500,00');
      expect(formatDecimalBR(0.5)).toBe('0,50');
    });

    it('returns empty string for 0 when allowEmpty is true (default)', () => {
      expect(formatDecimalBR(0)).toBe('');
      expect(formatDecimalBR(0, false)).toBe('0,00');
    });
  });

  describe('parseDecimalBR', () => {
    it('parses pt-BR strings with comma as decimal separator', () => {
      expect(parseDecimalBR('1234,56')).toBe(1234.56);
      expect(parseDecimalBR('1.234,56')).toBe(1234.56);
      expect(parseDecimalBR('10.500,75')).toBe(10500.75);
    });

    it('parses standard dot-separated decimals', () => {
      expect(parseDecimalBR('1234.56')).toBe(1234.56);
      expect(parseDecimalBR('1,234.56')).toBe(1234.56);
    });

    it('parses integers and simple inputs', () => {
      expect(parseDecimalBR('500')).toBe(500);
      expect(parseDecimalBR('0')).toBe(0);
      expect(parseDecimalBR('')).toBe(0);
    });

    it('parses negative numbers correctly', () => {
      expect(parseDecimalBR('-250,50')).toBe(-250.5);
    });
  });

  describe('formatCompactBRL', () => {
    it('formats thousands with k suffix', () => {
      expect(formatCompactBRL(5000)).toBe('5,0k');
    });

    it('formats millions with M suffix', () => {
      expect(formatCompactBRL(2500000)).toBe('2,5M');
    });
  });

  describe('formatPercent', () => {
    it('formats percentages with comma and sign', () => {
      expect(formatPercent(12.5)).toBe('+12,5%');
      expect(formatPercent(-5)).toBe('-5,0%');
    });
  });

  describe('getCurrentMonthId and getDefaultActiveMonthId', () => {
    it('retorna o ID do mês no formato YYYY-MM para uma data de referência', () => {
      const fixedDate = new Date(2026, 8, 27); // Setembro = 8 (0-based)
      expect(getCurrentMonthId(fixedDate)).toBe('2026-09');
    });

    it('encontra o mês atual exato quando presente na lista', () => {
      const fixedDate = new Date(2026, 8, 27);
      const months = generateMonthSequence(2026, 0, 12);
      expect(getDefaultActiveMonthId(months, fixedDate)).toBe('2026-09');
    });

    it('faz fallback para o mesmo mês do ano caso o ano seja diferente mas o índice exista', () => {
      const fixedDate = new Date(2026, 8, 27); // Setembro (índice 8)
      const months = generateMonthSequence(2027, 0, 12);
      expect(getDefaultActiveMonthId(months, fixedDate)).toBe('2027-09');
    });

    it('retorna o primeiro mês caso o mês de referência não possa ser casado', () => {
      const fixedDate = new Date(2026, 8, 27);
      const months = [
        createMonthItem(2028, 0), // Janeiro 2028
        createMonthItem(2028, 1), // Fevereiro 2028
      ];
      expect(getDefaultActiveMonthId(months, fixedDate)).toBe('2028-01');
    });

    it('retorna string vazia se a lista de meses estiver vazia', () => {
      expect(getDefaultActiveMonthId([])).toBe('');
    });
  });
});

