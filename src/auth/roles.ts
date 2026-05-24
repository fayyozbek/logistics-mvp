import type { Page } from '../App';
import type { UserRole } from '../types/auth';

export const roleLabels: Record<UserRole, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
  operator: 'Оператор',
  finance: 'Финансист',
  viewer: 'Наблюдатель',
};

export type ApiAction =
  | 'shipment.create'
  | 'shipment.delete'
  | 'shipment.updateStatus'
  | 'checkpoint.create'
  | 'checkpoint.update'
  | 'finance.updateStatus'
  | 'telegram.updateSettings'
  | 'telegram.testMessage'
  | 'telegram.viewJournal';

const pageAccess: Record<Page, UserRole[]> = {
  dashboard: ['admin', 'manager', 'operator', 'finance', 'viewer'],
  shipments: ['admin', 'manager', 'operator', 'finance', 'viewer'],
  tracking: ['admin', 'manager', 'operator', 'finance', 'viewer'],
  managers: ['admin', 'manager', 'operator'],
  finance: ['admin', 'manager', 'operator', 'finance', 'viewer'],
  telegram: ['admin', 'manager', 'operator', 'finance'],
  users: ['admin'],
  archive: ['admin', 'manager'],
  settings: ['admin'],
};

const actionAccess: Record<ApiAction, UserRole[]> = {
  'shipment.create': ['admin', 'manager'],
  'shipment.delete': ['admin', 'manager'],
  'shipment.updateStatus': ['admin', 'manager', 'operator'],
  'checkpoint.create': ['admin', 'manager', 'operator'],
  'checkpoint.update': ['admin', 'manager', 'operator'],
  'finance.updateStatus': ['admin', 'finance'],
  'telegram.updateSettings': ['admin'],
  'telegram.testMessage': ['admin'],
  'telegram.viewJournal': ['admin', 'manager'],
};

export function canAccessPage(role: UserRole, page: Page): boolean {
  return pageAccess[page]?.includes(role) ?? false;
}

export function canPerformAction(role: UserRole, action: ApiAction): boolean {
  return actionAccess[action]?.includes(role) ?? false;
}

export function filterNavPages(role: UserRole, pages: Page[]): Page[] {
  return pages.filter((page) => canAccessPage(role, page));
}

export function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || '?';
}
