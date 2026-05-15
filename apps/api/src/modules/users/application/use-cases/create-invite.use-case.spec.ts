import { ConflictException } from '../../../../shared/exceptions/domain.exception';
import { Invite } from '../../../auth/domain/entities/invite.entity';
import { type IInviteRepository } from '../ports/invite.repository.port';

import { CreateInviteUseCase } from './create-invite.use-case';

const makeInvite = (overrides: Partial<Invite> = {}): Invite =>
  ({
    id: 'invite-1',
    organizationId: 'org-1',
    email: 'new@example.com',
    roleKey: 'COACH',
    schoolIds: null,
    tokenHash: 'hash',
    invitedBy: 'user-admin',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    acceptedAt: null,
    revokedAt: null,
    context: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Invite;

describe('CreateInviteUseCase', () => {
  let useCase: CreateInviteUseCase;
  let inviteRepo: jest.Mocked<IInviteRepository>;

  beforeEach(() => {
    inviteRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findActiveByEmail: jest.fn(),
      revoke: jest.fn(),
      findAllByOrganization: jest.fn(),
    } as jest.Mocked<IInviteRepository>;
    useCase = new CreateInviteUseCase(inviteRepo);
  });

  it('creates invite and returns inviteId and token', async () => {
    inviteRepo.findActiveByEmail.mockResolvedValue(null);
    inviteRepo.create.mockResolvedValue(makeInvite());

    const result = await useCase.execute({
      organizationId: 'org-1',
      email: 'new@example.com',
      roleKey: 'COACH',
      invitedBy: 'user-admin',
    });

    expect(result).toHaveProperty('inviteId');
    expect(result).toHaveProperty('token');
    expect(typeof result.token).toBe('string');
    expect(result.token).toHaveLength(64); // 32 bytes hex = 64 chars
    expect(inviteRepo.findActiveByEmail).toHaveBeenCalledWith('org-1', 'new@example.com');
    expect(inviteRepo.create).toHaveBeenCalledTimes(1);
  });

  it('throws ConflictException when active invite already exists', async () => {
    inviteRepo.findActiveByEmail.mockResolvedValue(makeInvite());

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        email: 'new@example.com',
        roleKey: 'COACH',
        invitedBy: 'user-admin',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws ConflictException with correct code', async () => {
    inviteRepo.findActiveByEmail.mockResolvedValue(makeInvite());

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        email: 'new@example.com',
        roleKey: 'COACH',
        invitedBy: 'user-admin',
      }),
    ).rejects.toMatchObject({ code: 'INVITE_ALREADY_PENDING' });
  });

  it('does not call create when invite already pending', async () => {
    inviteRepo.findActiveByEmail.mockResolvedValue(makeInvite());

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        email: 'new@example.com',
        roleKey: 'COACH',
        invitedBy: 'user-admin',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(inviteRepo.create).not.toHaveBeenCalled();
  });
});
