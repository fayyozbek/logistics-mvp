export function getApiBaseUrl(): string | null {
  const value = import.meta.env.VITE_API_BASE_URL;
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  return value.trim().replace(/\/+$/, '');
}

export function isApiConfigured(): boolean {
  return getApiBaseUrl() !== null;
}

async function fetchJson<T>(path: string): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error('VITE_API_BASE_URL is not set');
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(`${base}${normalizedPath}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`API request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export async function requestWithMockFallback<T>(
  path: string,
  mock: () => T,
): Promise<T> {
  if (!isApiConfigured()) {
    return mock();
  }

  try {
    return await fetchJson<T>(path);
  } catch {
    return mock();
  }
}
