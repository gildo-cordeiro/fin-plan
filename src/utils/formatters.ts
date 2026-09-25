import { MonthItem } from '../types/budget';

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const MONTH_SHORT_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export function formatBRL(value: number, includeSign = false): string {
  if (isNaN(value)) value = 0;
  const isNegative = value < 0;
  const absFormatted = Math.abs(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (isNegative) {
    return `- ${absFormatted}`;
  }
  if (includeSign && value > 0) {
    return `+ ${absFormatted}`;
  }
  return absFormatted;
}

export function formatCompactBRL(value: number): string {
  if (isNaN(value)) value = 0;
  const isNegative = value < 0;
  const abs = Math.abs(value);
  const sign = isNegative ? '−' : '';

  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1).replace('.', ',')}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(1).replace('.', ',')}k`;
  }
  return `${sign}${abs.toFixed(0)}`;
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
