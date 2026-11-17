/**
 * Indian Rupee (₹) Currency Utilities
 * Formats numbers according to the Indian numbering system (Lakhs, Crores)
 */

export const CURRENCY_SYMBOL = '₹';
export const CURRENCY_CODE = 'INR';

/**
 * Format a number into standard Indian Rupee format.
 * Example: 150000 -> ₹1,50,000.00 or ₹1,50,000
 */
export function formatRupees(
  amount: number,
  options: {
    showDecimals?: boolean;
    showSign?: boolean;
    compact?: boolean;
  } = {}
): string {
  const { showDecimals = false, showSign = false, compact = false } = options;
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  if (compact) {
    let compactFormatted = '';
    if (absAmount >= 10000000) {
      // Crores
      compactFormatted = `${(absAmount / 10000000).toFixed(2).replace(/\.00$/, '')}Cr`;
    } else if (absAmount >= 100000) {
      // Lakhs
      compactFormatted = `${(absAmount / 100000).toFixed(2).replace(/\.00$/, '')}L`;
    } else if (absAmount >= 1000) {
      // Thousands
      compactFormatted = `${(absAmount / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    } else {
      compactFormatted = absAmount.toFixed(0);
    }

    const sign = showSign ? (isNegative ? '- ' : '+ ') : (isNegative ? '- ' : '');
    return `${sign}${CURRENCY_SYMBOL}${compactFormatted}`;
  }

  // Standard Indian Rupee format using Intl.NumberFormat
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });

  const formatted = formatter.format(absAmount);
  // standard Intl outputs "₹1,50,000"

  if (showSign) {
    return isNegative ? `- ${formatted}` : `+ ${formatted}`;
  }

  return isNegative ? `- ${formatted}` : formatted;
}

/**
 * Parse a raw string amount or input into a clean numeric float.
 */
export function parseRupees(val: string | number): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = val.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
