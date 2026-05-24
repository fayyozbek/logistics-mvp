import { ApiError, isApiConfigured } from './client';
import { clearApiReadError, reportApiReadError } from './apiReadStatus';

export const API_UNAVAILABLE_MESSAGE =
  'API недоступен. Показ демо-данных отключён для production режима.';

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (error instanceof Error && error.message) {
    return new ApiError(error.message, 0);
  }
  return new ApiError(API_UNAVAILABLE_MESSAGE, 0);
}

export function handleApiLoadFailure(error: unknown): ApiError {
  const apiError = normalizeApiError(error);
  if (isApiConfigured()) {
    reportApiReadError(apiError);
  }
  return apiError;
}

export function clearApiLoadErrorOnSuccess(): void {
  if (isApiConfigured()) {
    clearApiReadError();
  }
}
