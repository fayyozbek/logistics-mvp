import type { ApiValidationErrors } from '../types/api';

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

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Не удалось загрузить данные с API.',
): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return 'API недоступен. Проверьте, что backend запущен и VITE_API_BASE_URL указан верно.';
    }
    return error.message;
  }

  return fallback;
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
  let response: Response;

  try {
    response = await fetch(`${base}${normalizedPath}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError('API недоступен. Проверьте, что backend запущен и VITE_API_BASE_URL указан верно.', 0);
  }

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
  return requestJson<T>(path, {
    method: 'DELETE',
  });
}

export async function requestWithMockFallback<T>(
  path: string,
  mock: () => T,
): Promise<T> {
  if (!isApiConfigured()) {
    return mock();
  }

  return fetchJson<T>(path);
}
