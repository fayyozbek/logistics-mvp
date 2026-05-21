/** Strip spaces and comma thousands separators from user input. */
export function stripFormattedNumber(value: string): string {
  return value.replace(/\s/g, '').replace(/,/g, '');
}

/** Parse a formatted numeric string to a finite number, or null if invalid. */
export function parseFormattedNumber(value: string): number | null {
  const raw = stripFormattedNumber(value.trim());
  if (!raw) return null;
  if (!/^\d+(\.\d+)?$/.test(raw)) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

/** Format digits with space thousands separators; preserves decimal part. */
export function formatNumberWithGrouping(value: string): string {
  const raw = stripFormattedNumber(value.trim());
  if (!raw) return '';
  const match = raw.match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) return value.trim();

  const intPart = match[1].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const fraction = match[2];
  return fraction !== undefined ? `${intPart}.${fraction}` : intPart;
}

/** Normalize formatted quantity input for API payload (unformatted numeric string). */
export function sanitizeFormattedNumberForPayload(value: string): string {
  const num = parseFormattedNumber(value);
  if (num === null) return '';
  return Number.isInteger(num) ? String(num) : String(num);
}

/** Full USD display with locale grouping, e.g. $12,400. */
export function formatMoneyUsd(value: number): string {
  return `$${value.toLocaleString()}`;
}

/** Compact USD for dashboard KPI cards, e.g. $12k or $1.2M. */
export function formatMoneyUsdCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(value / 1000)}k`;
}
