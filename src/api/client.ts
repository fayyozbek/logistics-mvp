import type { ApiValidationErrors } from '../types/api';
import { clearAuthToken, getAuthToken } from '../auth/token';

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

type RequestOptions = {
  skipAuth?: boolean;
};

let unauthorizedHandler: (() => void) | null = null;
let forbiddenHandler: ((message: string) => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export function setForbiddenHandler(handler: ((message: string) => void) | null): void {
  forbiddenHandler = handler;
}

async function parseErrorBody(response: Response): Promise<{ message?: string; errors?: ApiValidationErrors }> {
  try {
    return await response.json() as { message?: string; errors?: ApiValidationErrors };
  } catch {
    return {};
  }
}

function buildHeaders(body: BodyInit | null | undefined, extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(body ? { 'Content-Type': 'application/json' } : {}),
  };

  if (extra) {
    const extraHeaders = new Headers(extra);
    extraHeaders.forEach((value, key) => {
      headers[key] = value;
    });
  }

  return headers;
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
  requestOptions: RequestOptions = {},
): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new ApiError('VITE_API_BASE_URL is not set', 0);
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const token = requestOptions.skipAuth ? null : getAuthToken();

  const headers = buildHeaders(options.body, options.headers);
  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(`${base}${normalizedPath}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError('API недоступен. Проверьте, что backend запущен и VITE_API_BASE_URL указан верно.', 0);
  }

  if (response.status === 401) {
    clearAuthToken();
    unauthorizedHandler?.();
    const body = await parseErrorBody(response);
    throw new ApiError(body.message ?? 'Требуется авторизация.', 401);
  }

  if (response.status === 403) {
    const body = await parseErrorBody(response);
    const message = body.message ?? 'Недостаточно прав для этого действия.';
    forbiddenHandler?.(message);
    throw new ApiError(message, 403);
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

export function requestJsonPublic<T>(path: string, options: RequestInit = {}): Promise<T> {
  return requestJson<T>(path, options);
}

async function fetchJson<T>(path: string): Promise<T> {
  return requestJson<T>(path);
}

export function postJson<T>(
  path: string,
  data: unknown,
  requestOptions: RequestOptions = {},
): Promise<T> {
  return requestJson<T>(
    path,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    requestOptions,
  );
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
