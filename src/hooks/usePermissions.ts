import { canPerformAction, type ApiAction } from '../auth/roles';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/auth';

export function usePermissions() {
  const { user, authRequired } = useAuth();

  const role: UserRole | null = user?.role ?? null;

  const can = (action: ApiAction): boolean => {
    if (!authRequired) {
      return true;
    }
    if (!role) {
      return false;
    }
    return canPerformAction(role, action);
  };

  return { role, can };
}
