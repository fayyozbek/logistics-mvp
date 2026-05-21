import type { ApiValidationErrors } from '../types/api';
import { downloadTextFile } from '../utils/csv';

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

export class ApiError extends Error {
  status: number;
  validationErrors?: ApiValidationErrors;

  constructor(message: string, status: number, validationErrors?: ApiValidationErrors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.validationErrors = validationErrors;
  }
}

async function parseErrorBody(response: Response): Promise<{ message?: string; errors?: ApiValidationErrors }> {
  try {
    return await response.json() as { message?: string; errors?: ApiValidationErrors };
  } catch {
    return {};
  }
}

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new ApiError('VITE_API_BASE_URL is not set', 0);
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(`${base}${normalizedPath}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await parseErrorBody(response);
    if (response.status === 422 && body.errors) {
      throw new ApiError(body.message ?? 'Validation failed', 422, body.errors);
    }
    throw new ApiError(body.message ?? `API request failed (${response.status})`, response.status);
  }

  return response.json() as Promise<T>;
}

async function fetchJson<T>(path: string): Promise<T> {
  return requestJson<T>(path);
}

export function postJson<T>(path: string, data: unknown): Promise<T> {
  return requestJson<T>(path, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function patchJson<T>(path: string, data: unknown): Promise<T> {
  return requestJson<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteJson<T>(path: string): Promise<T> {
  return requestJson<T>(path, { method: 'DELETE' });
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

export async function downloadCsv(path: string, filename: string, mockCsv: () => string): Promise<void> {
  if (!isApiConfigured()) {
    downloadTextFile(mockCsv(), filename);
    return;
  }

  const base = getApiBaseUrl();
  if (!base) {
    downloadTextFile(mockCsv(), filename);
    return;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(`${base}${normalizedPath}`, {
    headers: { Accept: 'text/csv' },
  });

  if (!response.ok) {
    const body = await parseErrorBody(response);
    throw new ApiError(body.message ?? `CSV export failed (${response.status})`, response.status);
  }

  downloadTextFile(await response.text(), filename);
}
