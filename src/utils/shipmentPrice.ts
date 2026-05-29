import { formatNumberWithGrouping, parseFormattedNumber, stripFormattedNumber } from './numberFormat';

export const SHIPMENT_CURRENCIES = ['USD', 'KRW', 'UZS', 'KZT', 'GEL'] as const;

export type ShipmentCurrency = (typeof SHIPMENT_CURRENCIES)[number];

export const DEFAULT_SHIPMENT_CURRENCY: ShipmentCurrency = 'USD';

const currencySymbols: Record<ShipmentCurrency, string> = {
  USD: '$',
  KRW: '₩',
  UZS: 'сум ',
  KZT: '₸',
  GEL: '₾',
};

export function formatMoneyWithCurrency(value: number, currency: string): string {
  const code = (SHIPMENT_CURRENCIES.includes(currency as ShipmentCurrency) ? currency : 'USD') as ShipmentCurrency;
  const symbol = currencySymbols[code];
  const formatted = value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  if (code === 'UZS') {
    return `${symbol}${formatted}`;
  }
  return `${symbol}${formatted}`;
}

export function formatPriceInputDisplay(value: string): string {
  return formatNumberWithGrouping(value);
}

export function parsePriceAmountForPayload(value: string): number | null {
  return parseFormattedNumber(value);
}

export function priceAmountToFormValue(amount: number | undefined): string {
  if (amount === undefined || amount === null) return '';
  if (amount === 0) return '';
  return formatNumberWithGrouping(String(amount));
}

export function validatePriceAmountField(value: string, required = false): string | null {
  const trimmed = stripFormattedNumber(value.trim());
  if (!trimmed) {
    return required ? 'Стоимость перевозки: укажите сумму (0 или больше).' : null;
  }
  const num = parseFormattedNumber(value);
  if (num === null) {
    return 'Стоимость перевозки: укажите корректное число.';
  }
  if (num < 0) {
    return 'Стоимость перевозки: не может быть отрицательной.';
  }
  return null;
}
