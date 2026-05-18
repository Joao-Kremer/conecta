import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability';

import type { AppPermission } from './permissions';

// CASL ability mirrors backend permissions for UX only (hide/disable UI).
// Real authorization — including ownership scopes — is enforced server-side
// by guards and ownership resolvers. See docs/03-AUTH_AND_PERMISSIONS.md.
export type AppAbility = MongoAbility<[string, string]>;

export interface AbilityUser {
  permissions?: AppPermission[] | null;
}

// "school_modality" -> "SchoolModality"
function toSubject(resource: string): string {
  return resource
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Builds a CASL ability from the user's flat permission strings.
 *
 * Permissions follow `resource:action[.scope]`. The `.scope` suffix
 * (`.own-school` / `.own-class` / `.own`) is intentionally dropped: scope
 * is resolved per-request on the server, so the client only needs the
 * coarse "can this action exist for this subject" signal for UX gating.
 *
 * `student:read.own-school` -> `can('read', 'Student')`.
 */
export function defineAbilityFor(user: AbilityUser | null | undefined): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  for (const permission of user?.permissions ?? []) {
    const [base] = permission.split('.');
    if (!base) continue;
    const [resource, action] = base.split(':');
    if (!resource || !action) continue;
    can(action, toSubject(resource));
  }

  return build();
}
