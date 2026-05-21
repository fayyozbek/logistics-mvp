import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import {
  findLocationByValue,
  locationInputLabel,
  normalizeLocationValue,
  searchLocations,
} from '../data/locations';
import type { LocationRecord } from '../types/location';

type LocationAutocompleteProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  inputStyle?: CSSProperties;
};

export function LocationAutocomplete({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  inputStyle,
}: LocationAutocompleteProps) {
  const listId = useId();
  const rootRef = useRef<HTMLLabelElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const suggestions = searchLocations(focused ? query : value, 8);
  const displayValue = focused ? query : locationInputLabel(value);

  useEffect(() => {
    if (!focused) setQuery(locationInputLabel(value));
  }, [value, focused]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const commitValue = (raw: string) => {
    onChange(normalizeLocationValue(raw));
    setFocused(false);
    setOpen(false);
  };

  const selectLocation = (loc: LocationRecord) => {
    onChange(loc.cityName);
    setQuery(loc.displayName);
    setFocused(false);
    setOpen(false);
  };

  const defaultInputStyle: CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #E2E8F0',
    fontSize: 12,
    background: '#fff',
    outline: 'none',
  };

  return (
    <label ref={rootRef} style={{ display: 'block', position: 'relative' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>{label}</div>
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        value={displayValue}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => {
          setFocused(true);
          setQuery(locationInputLabel(value) || value);
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          const match = findLocationByValue(e.target.value);
          if (match) onChange(match.cityName);
        }}
        onBlur={() => {
          window.setTimeout(() => {
            if (!rootRef.current?.contains(document.activeElement)) {
              commitValue(query);
            }
          }, 120);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false);
            setFocused(false);
            setQuery(locationInputLabel(value));
          }
          if (e.key === 'Enter' && open && suggestions[0]) {
            e.preventDefault();
            selectLocation(suggestions[0]);
          }
        }}
        style={{ ...defaultInputStyle, ...inputStyle }}
      />
      {open && suggestions.length > 0 && !disabled && (
        <ul
          id={listId}
          role="listbox"
          style={{
            position: 'absolute',
            zIndex: 50,
            left: 0,
            right: 0,
            top: '100%',
            margin: '4px 0 0',
            padding: 4,
            listStyle: 'none',
            background: '#fff',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
            maxHeight: 220,
            overflowY: 'auto',
          }}
        >
          {suggestions.map((loc) => (
            <li key={`${loc.countryCode}-${loc.cityName}`} role="option">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectLocation(loc)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  border: 'none',
                  borderRadius: 6,
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: '#0F172A',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#F1F5F9';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                <div style={{ fontWeight: 600 }}>{loc.cityName}</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>{loc.countryName}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </label>
  );
}
