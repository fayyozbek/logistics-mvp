import { stripFormattedNumber } from './numberFormat';

export const MAX_POSITIVE_NUMBER = 99_999_999.999;

/** True when every value is a non-empty string after trim. */
export function hasRequiredStrings(...values: (string | undefined | null)[]): boolean {
  return values.every((value) => Boolean(String(value ?? '').trim()));
}

export function validatePositiveNumber(
  value: string,
  label: string,
  max: number = MAX_POSITIVE_NUMBER,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const raw = stripFormattedNumber(trimmed);
  if (!/^\d+(\.\d+)?$/.test(raw)) {
    return `${label}: введите положительное число`;
  }

  const num = Number(raw);
  if (num <= 0) {
    return `${label}: значение должно быть больше 0`;
  }
  if (num > max) {
    return `${label}: слишком большое значение`;
  }

  return null;
}

export function validateAllowedUnit<T extends string>(
  unit: string,
  allowed: readonly T[],
  label: string,
  allowedHint: string,
): string | null {
  if (!allowed.includes(unit as T)) {
    return `${label}: выберите единицу (${allowedHint})`;
  }
  return null;
}

/** Normalize quantity field input while typing (digits and single decimal point). */
export function normalizeDecimalInput(raw: string): string {
  const cleaned = stripFormattedNumber(raw).replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
}
