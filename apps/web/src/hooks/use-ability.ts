import { hasPermission, hasAnyPermission } from '@conecta/shared';
import { useAuthStore } from '@/stores/auth.store';

export function useAbility() {
  const user = useAuthStore((s) => s.user);
  const permissions = user?.permissions ?? [];

  return {
    can: (permission: string) => hasPermission(permissions, permission),
    canAny: (perms: string[]) => hasAnyPermission(permissions, perms),
  };
}
