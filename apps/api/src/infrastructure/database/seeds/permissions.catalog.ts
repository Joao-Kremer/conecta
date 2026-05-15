export interface PermissionDef {
  key: string;
  resource: string;
  action: string;
  scope: string | null;
}

function perm(key: string): PermissionDef {
  const parts = key.split(':');
  const resource = parts[0]!;
  const rest = parts[1]!;
  const dotIdx = rest.indexOf('.');
  const action = dotIdx === -1 ? rest : rest.slice(0, dotIdx);
  const scope = dotIdx === -1 ? null : rest.slice(dotIdx + 1);
  return { key, resource, action, scope };
}

export const PERMISSIONS_CATALOG: PermissionDef[] = [
  // Organization
  perm('organization:read'), perm('organization:update'),
  // School
  perm('school:create'), perm('school:read'), perm('school:read.own-school'),
  perm('school:update'), perm('school:delete'),
  // Modality
  perm('modality:create'), perm('modality:read'), perm('modality:update'), perm('modality:delete'),
  // SchoolModality
  perm('school-modality:create'), perm('school-modality:create.own-school'),
  perm('school-modality:read'), perm('school-modality:read.own-school'),
  perm('school-modality:update'), perm('school-modality:update.own-school'),
  perm('school-modality:delete'), perm('school-modality:delete.own-school'),
  // Class
  perm('class:create'), perm('class:create.own-school'),
  perm('class:read'), perm('class:read.own-school'), perm('class:read.own'),
  perm('class:update'), perm('class:update.own-school'),
  perm('class:delete'), perm('class:delete.own-school'),
  perm('class:assign-coach'), perm('class:assign-coach.own-school'),
  // User & roles
  perm('user:create'), perm('user:read'), perm('user:read.own-school'),
  perm('user:update'), perm('user:delete'), perm('user:invite'), perm('user:impersonate'),
  perm('role:read'), perm('role:assign'),
  // Student
  perm('student:create'), perm('student:create.own-school'),
  perm('student:read'), perm('student:read.own-school'), perm('student:read.own'),
  perm('student:update'), perm('student:update.own-school'), perm('student:update.own'),
  perm('student:delete'), perm('student:delete.own-school'),
  perm('student:export'), perm('student:anonymize'),
  // Guardian
  perm('guardian:create'), perm('guardian:create.own-school'),
  perm('guardian:read'), perm('guardian:read.own-school'), perm('guardian:read.own'),
  perm('guardian:update'), perm('guardian:update.own-school'), perm('guardian:update.own'),
  perm('guardian:delete'),
  // Enrollment
  perm('enrollment:create'), perm('enrollment:create.own-school'),
  perm('enrollment:read'), perm('enrollment:read.own-school'), perm('enrollment:read.own'),
  perm('enrollment:update'), perm('enrollment:update.own-school'),
  perm('enrollment:cancel'), perm('enrollment:cancel.own-school'),
  // Attendance
  perm('attendance:create'), perm('attendance:create.own-school'), perm('attendance:create.own-class'),
  perm('attendance:read'), perm('attendance:read.own-school'), perm('attendance:read.own'),
  // Finance
  perm('invoice:create'), perm('invoice:create.own-school'),
  perm('invoice:read'), perm('invoice:read.own-school'), perm('invoice:read.own'),
  perm('invoice:cancel'), perm('invoice:cancel.own-school'), perm('invoice:refund'),
  perm('payment:create'), perm('payment:create.own-school'),
  perm('payment:read'), perm('payment:read.own-school'), perm('payment:read.own'),
  perm('payment:refund'),
  perm('subscription:read'), perm('subscription:read.own-school'),
  perm('subscription:pause'), perm('subscription:pause.own-school'),
  perm('subscription:cancel'), perm('subscription:cancel.own-school'),
  // Notifications (Sprint 6)
  perm('notification:create'), perm('notification:read'), perm('notification:delete'),
  // Reports
  perm('report:read'), perm('report:read.own-school'), perm('report:export'),
  // Audit
  perm('audit:read'), perm('audit:read.own-school'),
  // Settings
  perm('settings:read'), perm('settings:update'),
  // Branding
  perm('brand:read'), perm('brand:update'),
  // Payment gateway
  perm('payment-gateway:read'), perm('payment-gateway:connect'), perm('payment-gateway:disconnect'),
];
