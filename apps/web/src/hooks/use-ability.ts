import { defineAbilityFor, type AbilityUser } from '@conecta/shared';
import { useMemo } from 'react';

import { useAuthStore } from '@/stores/auth.store';

// CASL ability for UX gating only (hide/disable). Server enforces real auth.
// Reads the auth store by default; pass `userOverride` when the user is only
// available as a server-fetched prop (the store isn't hydrated yet — see the
// auth-store hydration gap in docs/09-SPRINTS.md Sprint 2).
export function useAbility(userOverride?: AbilityUser | null) {
  const storeUser = useAuthStore((s) => s.user);
  const user = userOverride ?? storeUser;
  return useMemo(() => defineAbilityFor(user), [user]);
}
