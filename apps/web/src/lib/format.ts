export function formatBRL(value: number, options?: { compact?: boolean; hideSymbol?: boolean }): string {
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: options?.hideSymbol ? 'decimal' : 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    notation: options?.compact ? 'compact' : 'standard',
  });

  let formatted = formatter.format(value);
  
  if (value < 0 && !formatted.startsWith('-')) {
      // In pt-BR some browsers might format negative as -R$ or R$ -
      // This ensures we have a clean minus sign for negatives
      formatted = formatted.replace('-', '');
      return `-${formatted}`;
  }
  
  return formatted;
}

export function formatMonth(month: number, year: number): string {
    const date = new Date(year, month - 1, 1);
    const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
    const formatted = formatter.format(date);
    // Capitalize first letter of month
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
