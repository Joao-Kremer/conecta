import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { PasswordService } from '../../../../infrastructure/crypto/password.service';
import { IInviteRepository } from '../ports/invite.repository.port';
import { IUserRoleRepository } from '../ports/user-role.repository.port';
import { IUserRepository } from '../ports/user.repository.port';
import { validatePassword } from '../utils/password.utils';
import { hashToken } from '../utils/token.utils';

export interface AcceptInviteInput {
  token: string;
  name: string;
  password: string;
}

export interface AcceptInviteOutput {
  userId: string;
}

@Injectable()
export class AcceptInviteUseCase {
  constructor(
    private readonly inviteRepo: IInviteRepository,
    private readonly userRepo: IUserRepository,
    private readonly userRoleRepo: IUserRoleRepository,
    private readonly passwordService: PasswordService,
  ) {}

  async execute(input: AcceptInviteInput): Promise<AcceptInviteOutput> {
    const pw = validatePassword(input.password);
    if (!pw.valid) {
      throw new BadRequestException(pw.reason);
    }

    const tokenHash = hashToken(input.token);
    const invite = await this.inviteRepo.findByTokenHash(tokenHash);

    if (!invite || invite.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired invite');
    }

    const existing = await this.userRepo.findByEmail(invite.organizationId, invite.email);
    if (existing) {
      throw new ConflictException('User already exists in this organization');
    }

    const passwordHash = await this.passwordService.hash(input.password);
    const user = await this.userRepo.create({
      id: uuidv7(),
      organizationId: invite.organizationId,
      email: invite.email,
      passwordHash,
      name: input.name,
      status: 'ACTIVE',
      verificationTokenHash: '',
      verificationTokenExpiresAt: new Date(0),
    });

    user.emailVerifiedAt = new Date();
    user.verificationTokenHash = null;
    user.verificationTokenExpiresAt = null;
    await this.userRepo.save(user);

    const roleId = await this.userRoleRepo.findRoleIdByKey(invite.roleKey);
    if (roleId) {
      await this.userRoleRepo.assignRole(user.id, roleId);
    }

    if (invite.roleKey === 'SCHOOL_STAFF' && Array.isArray(invite.schoolIds)) {
      for (const schoolId of invite.schoolIds) {
        await this.userRoleRepo.assignStaffSchool(user.id, schoolId, invite.organizationId);
      }
    }

    await this.inviteRepo.markAccepted(invite.id);

    return { userId: user.id };
  }
}
