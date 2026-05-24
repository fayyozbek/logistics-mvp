import locationsJson from './locations.json';
import type { LocationRecord } from '../types/location';

export type { LocationRecord } from '../types/location';

export const locations = locationsJson as LocationRecord[];

function normalizeSearchTerm(term: string): string {
  return term.trim().toLowerCase();
}

function locationSearchHaystack(location: LocationRecord): string {
  const parts = [
    location.cityName,
    location.countryName,
    location.countryCode,
    location.displayName,
    ...(location.searchAliases ?? []),
  ];
  return parts.join(' ').toLowerCase();
}

export function findLocationByValue(value: string): LocationRecord | undefined {
  const term = normalizeSearchTerm(value);
  if (!term) return undefined;
  return locations.find((loc) => {
    if (normalizeSearchTerm(loc.cityName) === term) return true;
    if (normalizeSearchTerm(loc.displayName) === term) return true;
    return (loc.searchAliases ?? []).some((alias) => normalizeSearchTerm(alias) === term);
  });
}

export function searchLocations(query: string, limit = 8): LocationRecord[] {
  const term = normalizeSearchTerm(query);
  if (!term) return locations.slice(0, limit);

  const scored = locations
    .map((loc) => {
      const city = normalizeSearchTerm(loc.cityName);
      const display = normalizeSearchTerm(loc.displayName);
      const haystack = locationSearchHaystack(loc);
      let score = 0;
      if (city === term || city.startsWith(term)) score += 100;
      if (display.startsWith(term)) score += 80;
      if (haystack.includes(term)) score += 40;
      (loc.searchAliases ?? []).forEach((alias) => {
        const a = normalizeSearchTerm(alias);
        if (a === term || a.startsWith(term)) score += 90;
      });
      return { loc, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.loc.cityName.localeCompare(b.loc.cityName));

  return scored.slice(0, limit).map(({ loc }) => loc);
}

/** Canonical English city name for API payload; falls back to trimmed input. */
export function normalizeLocationValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const match = findLocationByValue(trimmed);
  return match ? match.cityName : trimmed;
}

export function locationInputLabel(value: string): string {
  const match = findLocationByValue(value);
  return match ? match.displayName : value;
}
