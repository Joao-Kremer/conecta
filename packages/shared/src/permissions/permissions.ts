// Permission strings follow the pattern "resource:action" or "resource:action.scope"
export type AppPermission = string;

export function hasPermission(userPermissions: AppPermission[], required: AppPermission): boolean {
  return userPermissions.includes(required);
}

export function hasAnyPermission(userPermissions: AppPermission[], required: AppPermission[]): boolean {
  return required.some((p) => userPermissions.includes(p));
}
