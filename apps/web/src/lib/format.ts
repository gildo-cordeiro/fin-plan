import { MonthItem } from '../types/budget';

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const MONTH_SHORT_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export function formatBRL(value: number, optionsOrIncludeSign?: { compact?: boolean; hideSymbol?: boolean } | boolean): string {
  if (isNaN(value)) value = 0;
  
  const options = typeof optionsOrIncludeSign === 'boolean' 
    ? { includeSign: optionsOrIncludeSign } 
    : optionsOrIncludeSign || {};

  const formatter = new Intl.NumberFormat('pt-BR', {
    style: options.hideSymbol ? 'decimal' : 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    notation: options.compact ? 'compact' : 'standard',
  });

  let formatted = formatter.format(Math.abs(value));
  
  if (value < 0) {
    return `- ${formatted}`;
  }
  if ((options as any).includeSign && value > 0) {
    return `+ ${formatted}`;
  }
  return formatted;
}

export function formatMonth(month: number, year: number): string {
  const date = new Date(year, month - 1, 1);
  const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
  const formatted = formatter.format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Formata um número no formato decimal pt-BR (ex: 1234.5 -> "1.234,50").
 * Se allowEmpty for true e o valor for 0, retorna string vazia para exibir placeholder.
 */
export function formatDecimalBR(value: number, allowEmpty = true): string {
  if (isNaN(value) || (allowEmpty && value === 0)) return '';
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Converte entrada do usuário (aceitando "1.234,56", "1234,56", "1234.56", "1,234.56") em number.
 */
export function parseDecimalBR(raw: string): number {
  if (!raw) return 0;
  const trimmed = raw.trim();
  if (!trimmed) return 0;

  const hasComma = trimmed.includes(',');
  const hasDot = trimmed.includes('.');

  let clean = trimmed;
  if (hasComma && hasDot) {
    if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      clean = clean.replace(/,/g, '');
    }
  } else if (hasComma) {
    clean = clean.replace(',', '.');
  }

  clean = clean.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatCompactBRL(value: number): string {
  return formatBRL(value, { compact: true });
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1).replace('.', ',')}%`;
}

export function createMonthItem(year: number, monthIndex: number): MonthItem {
  const normalizedDate = new Date(year, monthIndex, 1);
  const y = normalizedDate.getFullYear();
  const m = normalizedDate.getMonth();
  const shortYear = y.toString().slice(-2);
  const monthPad = (m + 1).toString().padStart(2, '0');

  return {
    id: `${y}-${monthPad}`,
    name: `${MONTH_NAMES[m]} ${y}`,
    shortName: `${MONTH_SHORT_NAMES[m]}/${shortYear}`,
    year: y,
    monthIndex: m,
  };
}

export function generateMonthSequence(startYear: number, startMonthIndex: number, count: number): MonthItem[] {
  const result: MonthItem[] = [];
  for (let i = 0; i < count; i++) {
    result.push(createMonthItem(startYear, startMonthIndex + i));
  }
  return result;
}

export function getNextMonth(currentLast: MonthItem): MonthItem {
  return createMonthItem(currentLast.year, currentLast.monthIndex + 1);
}

export function getPrevMonth(currentFirst: MonthItem): MonthItem {
  return createMonthItem(currentFirst.year, currentFirst.monthIndex - 1);
}

export function getCurrentMonthId(referenceDate = new Date()): string {
  const y = referenceDate.getFullYear();
  const m = (referenceDate.getMonth() + 1).toString().padStart(2, '0');
  return `${y}-${m}`;
}

export function getDefaultActiveMonthId(months: MonthItem[], referenceDate = new Date()): string {
  if (!months || months.length === 0) return '';
  const currentId = getCurrentMonthId(referenceDate);
  const exactMatch = months.find((m) => m.id === currentId);
  if (exactMatch) return exactMatch.id;

  const currentMonthIndex = referenceDate.getMonth();
  const sameIndexMatch = months.find((m) => m.monthIndex === currentMonthIndex);
  if (sameIndexMatch) return sameIndexMatch.id;

  return months[0].id;
}
