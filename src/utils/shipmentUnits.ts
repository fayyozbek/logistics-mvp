export const WEIGHT_UNITS = ['kg', 'ton'] as const;
export const VOLUME_UNITS = ['m3', 'cbm'] as const;

export type WeightUnit = (typeof WEIGHT_UNITS)[number];
export type VolumeUnit = (typeof VOLUME_UNITS)[number];

export const DEFAULT_WEIGHT_UNIT: WeightUnit = 'kg';
export const DEFAULT_VOLUME_UNIT: VolumeUnit = 'm3';

export const MAX_QUANTITY_VALUE = 99_999_999.999;

const WEIGHT_UNIT_ALIASES: Record<string, WeightUnit> = {
  kg: 'kg',
  кг: 'kg',
  ton: 'ton',
  тон: 'ton',
  t: 'ton',
};

const VOLUME_UNIT_ALIASES: Record<string, VolumeUnit> = {
  m3: 'm3',
  'm³': 'm3',
  cbm: 'cbm',
  куб: 'cbm',
};

export function resolveWeightUnit(unit?: string | null): WeightUnit {
  if (!unit) return DEFAULT_WEIGHT_UNIT;
  const key = unit.trim().toLowerCase();
  return WEIGHT_UNIT_ALIASES[key] ?? DEFAULT_WEIGHT_UNIT;
}

export function resolveVolumeUnit(unit?: string | null): VolumeUnit {
  if (!unit) return DEFAULT_VOLUME_UNIT;
  const key = unit.trim().toLowerCase();
  return VOLUME_UNIT_ALIASES[key] ?? DEFAULT_VOLUME_UNIT;
}

export function stripQuantityFormatting(value: string): string {
  return value.replace(/\s/g, '').replace(/,/g, '');
}

export function parseQuantityNumber(value: string): number | null {
  const raw = stripQuantityFormatting(value.trim());
  if (!raw) return null;
  if (!/^\d+(\.\d+)?$/.test(raw)) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

export function formatQuantityDisplay(value: string): string {
  const raw = stripQuantityFormatting(value.trim());
  if (!raw) return '';
  const match = raw.match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) return value.trim();

  const intPart = match[1].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const fraction = match[2];
  return fraction !== undefined ? `${intPart}.${fraction}` : intPart;
}

export function sanitizeQuantityForPayload(value: string): string {
  const num = parseQuantityNumber(value);
  if (num === null) return '';
  return Number.isInteger(num) ? String(num) : String(num);
}

export function validateQuantityValue(
  value: string,
  label: string,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const raw = stripQuantityFormatting(trimmed);
  if (!/^\d+(\.\d+)?$/.test(raw)) {
    return `${label}: введите положительное число`;
  }

  const num = Number(raw);
  if (num <= 0) {
    return `${label}: значение должно быть больше 0`;
  }
  if (num > MAX_QUANTITY_VALUE) {
    return `${label}: слишком большое значение`;
  }

  return null;
}

export function validateWeightField(value: string, unit: string): string | null {
  const quantityError = validateQuantityValue(value, 'Вес');
  if (quantityError) return quantityError;
  if (value.trim() && !WEIGHT_UNITS.includes(unit as WeightUnit)) {
    return 'Вес: выберите единицу (kg или ton)';
  }
  return null;
}

export function validateVolumeField(value: string, unit: string): string | null {
  const quantityError = validateQuantityValue(value, 'Объём');
  if (quantityError) return quantityError;
  if (value.trim() && !VOLUME_UNITS.includes(unit as VolumeUnit)) {
    return 'Объём: выберите единицу (m3 или cbm)';
  }
  return null;
}

function extractLeadingNumber(value: string): string {
  const match = value.trim().match(/^([\d\s.,]+)/);
  if (!match) return value.trim();
  const num = parseQuantityNumber(match[1]);
  return num !== null ? sanitizeQuantityForPayload(match[1]) : value.trim();
}

function extractTrailingUnit(value: string, aliases: Record<string, string>): string | undefined {
  const tail = value.trim().match(/([^\d\s.,]+)\s*$/);
  if (!tail) return undefined;
  const key = tail[1].trim().toLowerCase();
  return aliases[key];
}

export function parseShipmentWeightForForm(
  weight?: string | null,
  weightUnit?: string | null,
): { displayValue: string; unit: WeightUnit } {
  if (!weight?.trim()) {
    return { displayValue: '', unit: resolveWeightUnit(weightUnit) };
  }

  if (weightUnit?.trim()) {
    const numeric = extractLeadingNumber(weight);
    return {
      displayValue: numeric ? formatQuantityDisplay(numeric) : weight.trim(),
      unit: resolveWeightUnit(weightUnit),
    };
  }

  const legacyUnit = extractTrailingUnit(weight, WEIGHT_UNIT_ALIASES);
  const numeric = extractLeadingNumber(weight);
  return {
    displayValue: numeric ? formatQuantityDisplay(numeric) : weight.trim(),
    unit: legacyUnit ? resolveWeightUnit(legacyUnit) : DEFAULT_WEIGHT_UNIT,
  };
}

export function parseShipmentVolumeForForm(
  volume?: string | null,
  volumeUnit?: string | null,
): { displayValue: string; unit: VolumeUnit } {
  if (!volume?.trim()) {
    return { displayValue: '', unit: resolveVolumeUnit(volumeUnit) };
  }

  if (volumeUnit?.trim()) {
    const numeric = extractLeadingNumber(volume);
    return {
      displayValue: numeric ? formatQuantityDisplay(numeric) : volume.trim(),
      unit: resolveVolumeUnit(volumeUnit),
    };
  }

  const legacyUnit = extractTrailingUnit(volume, VOLUME_UNIT_ALIASES);
  const numeric = extractLeadingNumber(volume);
  return {
    displayValue: numeric ? formatQuantityDisplay(numeric) : volume.trim(),
    unit: legacyUnit ? resolveVolumeUnit(legacyUnit) : DEFAULT_VOLUME_UNIT,
  };
}

const WEIGHT_UNIT_LABELS: Record<WeightUnit, string> = {
  kg: 'kg',
  ton: 'ton',
};

const VOLUME_UNIT_LABELS: Record<VolumeUnit, string> = {
  m3: 'm³',
  cbm: 'cbm',
};

export function formatShipmentWeightDisplay(
  weight?: string | null,
  weightUnit?: string | null,
): string | undefined {
  if (!weight?.trim()) return undefined;
  const parsed = parseShipmentWeightForForm(weight, weightUnit);
  if (!parsed.displayValue) return undefined;
  const numeric = parseQuantityNumber(parsed.displayValue) ?? parseQuantityNumber(extractLeadingNumber(weight));
  if (numeric === null && parsed.displayValue === weight.trim()) {
    return weight.trim();
  }
  return `${parsed.displayValue} ${WEIGHT_UNIT_LABELS[parsed.unit]}`;
}

export function formatShipmentVolumeDisplay(
  volume?: string | null,
  volumeUnit?: string | null,
): string | undefined {
  if (!volume?.trim()) return undefined;
  const parsed = parseShipmentVolumeForForm(volume, volumeUnit);
  if (!parsed.displayValue) return undefined;
  const numeric = parseQuantityNumber(parsed.displayValue) ?? parseQuantityNumber(extractLeadingNumber(volume));
  if (numeric === null && parsed.displayValue === volume.trim()) {
    return volume.trim();
  }
  return `${parsed.displayValue} ${VOLUME_UNIT_LABELS[parsed.unit]}`;
}

export function buildWeightPayload(
  value: string,
  unit: string,
): { weight?: string; weightUnit?: string } {
  const trimmed = value.trim();
  if (!trimmed) return {};
  return {
    weight: sanitizeQuantityForPayload(trimmed),
    weightUnit: resolveWeightUnit(unit),
  };
}

export function buildVolumePayload(
  value: string,
  unit: string,
): { volume?: string; volumeUnit?: string } {
  const trimmed = value.trim();
  if (!trimmed) return {};
  return {
    volume: sanitizeQuantityForPayload(trimmed),
    volumeUnit: resolveVolumeUnit(unit),
  };
}
