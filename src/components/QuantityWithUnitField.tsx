import { useState, type CSSProperties } from 'react';
import { normalizeDecimalInput } from '../utils/formValidation';
import {
  formatNumberWithGrouping,
  stripFormattedNumber,
} from '../utils/numberFormat';
import {
  validateQuantityValue,
  type VolumeUnit,
  type WeightUnit,
} from '../utils/shipmentUnits';

type UnitOption = { value: string; label: string };

type QuantityWithUnitFieldProps = {
  quantityLabel: string;
  unitLabel: string;
  value: string;
  unit: string;
  units: readonly UnitOption[];
  onValueChange: (value: string) => void;
  onUnitChange: (unit: string) => void;
  disabled?: boolean;
  placeholder?: string;
  quantityStyle?: CSSProperties;
  unitStyle?: CSSProperties;
  externalError?: string | null;
};

export function QuantityWithUnitField({
  quantityLabel,
  unitLabel,
  value,
  unit,
  units,
  onValueChange,
  onUnitChange,
  disabled = false,
  placeholder,
  quantityStyle,
  unitStyle,
  externalError,
}: QuantityWithUnitFieldProps) {
  const [focused, setFocused] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const defaultFieldStyle: CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #E2E8F0',
    fontSize: 12,
    background: '#fff',
    outline: 'none',
  };

  const displayValue = focused ? value : (value.trim() ? formatNumberWithGrouping(value) : '');

  const handleChange = (raw: string) => {
    const normalized = normalizeDecimalInput(raw);
    onValueChange(normalized);
    setLocalError(validateQuantityValue(normalized, quantityLabel));
  };

  const error = externalError ?? localError;

  return (
    <div className="quantity-unit-field">
      <div className="quantity-unit-grid">
        <label>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>{quantityLabel}</div>
          <input
            type="text"
            inputMode="decimal"
            value={displayValue}
            placeholder={placeholder}
            disabled={disabled}
            onFocus={() => {
              setFocused(true);
              if (value.trim()) onValueChange(stripFormattedNumber(value));
            }}
            onBlur={() => {
              setFocused(false);
              if (value.trim()) {
                onValueChange(formatNumberWithGrouping(value));
                setLocalError(validateQuantityValue(value, quantityLabel));
              } else {
                setLocalError(null);
              }
            }}
            onChange={(e) => handleChange(e.target.value)}
            style={{
              ...defaultFieldStyle,
              borderColor: error ? '#EF4444' : '#E2E8F0',
              ...quantityStyle,
            }}
          />
        </label>
        <label>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>{unitLabel}</div>
          <select
            value={unit}
            disabled={disabled}
            onChange={(e) => onUnitChange(e.target.value as WeightUnit | VolumeUnit)}
            style={{
              ...defaultFieldStyle,
              cursor: disabled ? 'not-allowed' : 'pointer',
              ...unitStyle,
            }}
          >
            {units.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
