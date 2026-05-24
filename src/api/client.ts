import type { ApiValidationErrors } from '../types/api';
import { clearAuthToken, getAuthToken } from '../auth/token';
import { downloadTextFile } from '../utils/csv';
import { clearApiReadError } from './apiReadStatus';
import { normalizeApiError } from './loadError';

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

const API_WRITE_SUFFIX = ' доступно только при подключённом API (VITE_API_BASE_URL).';

export function apiNotConfiguredError(actionDescription: string): ApiError {
  return new ApiError(`${actionDescription}${API_WRITE_SUFFIX}`, 0);
}

export function encodeResourceId(id: string): string {
  return encodeURIComponent(id);
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

function normalizeApiPath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function resolveConfiguredBaseUrl(): string {
  const base = getApiBaseUrl();
  if (!base) {
    throw new ApiError('VITE_API_BASE_URL is not set', 0);
  }
  return base;
}

async function parseErrorBody(response: Response): Promise<{ message?: string; errors?: ApiValidationErrors }> {
  try {
    return await response.json() as { message?: string; errors?: ApiValidationErrors };
  } catch {
    return {};
  }
}

function buildHeaders(body: BodyInit | null | undefined, extra?: HeadersInit, token?: string | null): HeadersInit {
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

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
  requestOptions: RequestOptions = {},
): Promise<T> {
  const normalizedPath = normalizeApiPath(path);
  const token = requestOptions.skipAuth ? null : getAuthToken();

  let response: Response;

  try {
    response = await fetch(`${resolveConfiguredBaseUrl()}${normalizedPath}`, {
      ...options,
      headers: buildHeaders(options.body, options.headers, token),
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
  return requestJson<T>(path, options, { skipAuth: true });
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
    const result = await requestJson<T>(path);
    clearApiReadError();
    return result;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function downloadCsv(path: string, filename: string, mockCsv: () => string): Promise<void> {
  if (!isApiConfigured()) {
    downloadTextFile(mockCsv(), filename);
    return;
  }

  const token = getAuthToken();
  const headers: Record<string, string> = { Accept: 'text/csv' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${resolveConfiguredBaseUrl()}${normalizeApiPath(path)}`, { headers });

  if (response.status === 401) {
    clearAuthToken();
    unauthorizedHandler?.();
    throw new ApiError('Требуется авторизация.', 401);
  }

  if (response.status === 403) {
    const body = await parseErrorBody(response);
    const message = body.message ?? 'Недостаточно прав для этого действия.';
    forbiddenHandler?.(message);
    throw new ApiError(message, 403);
  }

  if (!response.ok) {
    const body = await parseErrorBody(response);
    throw new ApiError(body.message ?? `CSV export failed (${response.status})`, response.status);
  }

  downloadTextFile(await response.text(), filename);
}
