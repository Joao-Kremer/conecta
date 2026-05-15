import { BadRequestException, Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { PasswordService } from '../../../../infrastructure/crypto/password.service';
import { IEmailSender } from '../ports/email-sender.port';
import { IOrganizationRepository } from '../ports/organization.repository.port';
import { IUserRoleRepository } from '../ports/user-role.repository.port';
import { IUserRepository } from '../ports/user.repository.port';
import { validatePassword } from '../utils/password.utils';
import { generateSlug } from '../utils/slug.utils';
import { generateToken, hashToken } from '../utils/token.utils';

export interface SignupOrganizationInput {
  organizationName: string;
  adminName: string;
  email: string;
  password: string;
  acceptTerms: boolean;
}

export interface SignupOrganizationOutput {
  userId: string;
  organizationId: string;
}

@Injectable()
export class SignupOrganizationUseCase {
  constructor(
    private readonly orgRepo: IOrganizationRepository,
    private readonly userRepo: IUserRepository,
    private readonly userRoleRepo: IUserRoleRepository,
    private readonly passwordService: PasswordService,
    private readonly emailSender: IEmailSender,
  ) {}

  async execute(input: SignupOrganizationInput): Promise<SignupOrganizationOutput> {
    if (!input.acceptTerms) {
      throw new BadRequestException('You must accept the terms of service');
    }

    const pw = validatePassword(input.password);
    if (!pw.valid) {
      throw new BadRequestException(pw.reason);
    }

    const orgId = uuidv7();
    const userId = uuidv7();

    const baseSlug = generateSlug(input.organizationName) || 'org';
    const count = await this.orgRepo.countBySlugPrefix(baseSlug);
    const slug = count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;

    const org = await this.orgRepo.create({ id: orgId, name: input.organizationName, slug });

    const verificationToken = generateToken();
    const verificationTokenHash = hashToken(verificationToken);
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const passwordHash = await this.passwordService.hash(input.password);

    const user = await this.userRepo.create({
      id: userId,
      organizationId: org.id,
      email: input.email.toLowerCase().trim(),
      passwordHash,
      name: input.adminName,
      status: 'PENDING',
      verificationTokenHash,
      verificationTokenExpiresAt,
    });

    const adminRoleId = await this.userRoleRepo.findRoleIdByKey('ADMIN');
    if (adminRoleId) {
      await this.userRoleRepo.assignRole(user.id, adminRoleId);
    }

    await this.emailSender.sendVerification({
      to: user.email,
      name: user.name,
      token: verificationToken,
      expiresInHours: 24,
    });

    return { userId: user.id, organizationId: org.id };
  }
}
