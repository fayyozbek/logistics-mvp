import { ApiError } from '../api';
import { toastErrors, type ToastContextValue } from '../components/ToastProvider';

export function formatFieldErrors(
  errors: Record<string, string[]>,
  fieldLabels: Record<string, string>,
  mapMessage?: (field: string, message: string, label: string) => string | undefined,
): string[] {
  return Object.entries(errors).flatMap(([field, messages]) =>
    messages.map((message) => {
      const label = fieldLabels[field] ?? field;
      const custom = mapMessage?.(field, message, label);
      return custom ?? `${label}: ${message}`;
    }),
  );
}

export function showApiMutationError(
  showToast: ToastContextValue['showToast'],
  error: unknown,
  fallbackMessage: string,
  options?: {
    fieldLabels?: Record<string, string>;
    mapMessage?: (field: string, message: string, label: string) => string | undefined;
  },
): void {
  if (error instanceof ApiError && error.validationErrors && options?.fieldLabels) {
    toastErrors(showToast, formatFieldErrors(error.validationErrors, options.fieldLabels, options.mapMessage));
    return;
  }
  if (error instanceof ApiError) {
    showToast(error.message, 'error');
    return;
  }
  showToast(fallbackMessage, 'error');
}
