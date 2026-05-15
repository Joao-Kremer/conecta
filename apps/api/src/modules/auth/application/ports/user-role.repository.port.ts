export abstract class IUserRoleRepository {
  abstract findRoleIdByKey(key: string): Promise<string | null>;
  abstract assignRole(userId: string, roleId: string, assignedBy?: string): Promise<void>;
  abstract getUserRoleKeys(userId: string): Promise<string[]>;
  abstract assignStaffSchool(
    userId: string,
    schoolId: string,
    organizationId: string,
  ): Promise<void>;
}
