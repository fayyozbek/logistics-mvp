import type { ApiError } from './client';

type ApiReadErrorListener = (error: ApiError | null) => void;

let currentError: ApiError | null = null;
const listeners = new Set<ApiReadErrorListener>();

export function getApiReadError(): ApiError | null {
  return currentError;
}

export function subscribeApiReadError(listener: ApiReadErrorListener): () => void {
  listeners.add(listener);
  listener(currentError);
  return () => listeners.delete(listener);
}

export function reportApiReadError(error: ApiError): void {
  currentError = error;
  listeners.forEach((listener) => listener(currentError));
}

export function clearApiReadError(): void {
  if (!currentError) return;
  currentError = null;
  listeners.forEach((listener) => listener(null));
}
