import { findLocationByValue } from '../data/locations';
import { stripFormattedNumber } from './numberFormat';

export const MAX_POSITIVE_NUMBER = 99_999_999.999;

const CYRILLIC = /[А-Яа-яЁё]/u;

export function isRussianMessage(message: string): boolean {
  return CYRILLIC.test(message);
}

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

export function validateShipmentLocation(value: string, label: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return `${label}: укажите город`;
  }
  if (!findLocationByValue(trimmed)) {
    return `${label}: выберите город из списка`;
  }
  return null;
}

export function validateShipmentFormFields(input: {
  clientId: string;
  origin: string;
  destination: string;
}): string[] {
  const errors: string[] = [];

  if (!String(input.clientId ?? '').trim()) {
    errors.push('Клиент: выберите клиента');
  }

  const originError = validateShipmentLocation(input.origin, 'Откуда');
  if (originError) errors.push(originError);

  const destinationError = validateShipmentLocation(input.destination, 'Куда');
  if (destinationError) errors.push(destinationError);

  return errors;
}

/** Normalize quantity field input while typing (digits and single decimal point). */
export function normalizeDecimalInput(raw: string): string {
  const cleaned = stripFormattedNumber(raw).replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
}
