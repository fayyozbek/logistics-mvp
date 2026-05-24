import type { ApiValidationErrors } from '../types/api';
import { ApiError } from './client';

const blockedDeleteMessages: Record<string, string> = {
  manager: 'Нельзя удалить менеджера: у него есть активные грузы.',
  client: 'Нельзя удалить партнёра: он связан с грузами или финансовыми записями.',
};

export function formatValidationErrors(errors: ApiValidationErrors): string[] {
  return Object.entries(errors).flatMap(([field, messages]) =>
    messages.map((message) => {
      if (field === 'manager' && message.includes('active shipments')) {
        return blockedDeleteMessages.manager;
      }
      if (field === 'client' && message.includes('linked to shipments')) {
        return blockedDeleteMessages.client;
      }
      return message;
    }),
  );
}

export function getActionErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.validationErrors) {
      const formatted = formatValidationErrors(error.validationErrors);
      if (formatted.length > 0) {
        return formatted.join(' ');
      }
    }
    if (error.status === 403) {
      return 'Это действие недоступно для вашей роли.';
    }
    return error.message || fallback;
  }

  return fallback;
}
