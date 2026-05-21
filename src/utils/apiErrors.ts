import { ApiError } from '../api';
import { isRussianMessage } from './formValidation';
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
      if (custom !== undefined) return custom;
      if (isRussianMessage(message)) return message;
      return `${label}: ${message}`;
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
  if (error instanceof ApiError && error.validationErrors) {
    const messages = options?.fieldLabels
      ? formatFieldErrors(error.validationErrors, options.fieldLabels, options.mapMessage)
      : [error.message];
    toastErrors(showToast, messages.length > 0 ? messages : [error.message]);
    return;
  }
  if (error instanceof ApiError) {
    showToast(error.message, 'error');
    return;
  }
  showToast(fallbackMessage, 'error');
}
