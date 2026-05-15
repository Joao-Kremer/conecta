import {
  NotFoundException,
  UnprocessableException,
} from '../../../../shared/exceptions/domain.exception';
import { Invite } from '../../../auth/domain/entities/invite.entity';
import { type IInviteRepository } from '../ports/invite.repository.port';

import { RevokeInviteUseCase } from './revoke-invite.use-case';

const makeInvite = (overrides: Partial<Invite> = {}): Invite =>
  ({
    id: 'invite-1',
    organizationId: 'org-1',
    email: 'user@example.com',
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

describe('RevokeInviteUseCase', () => {
  let useCase: RevokeInviteUseCase;
  let inviteRepo: jest.Mocked<IInviteRepository>;

  beforeEach(() => {
    inviteRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findActiveByEmail: jest.fn(),
      revoke: jest.fn(),
      findAllByOrganization: jest.fn(),
    } as jest.Mocked<IInviteRepository>;
    useCase = new RevokeInviteUseCase(inviteRepo);
  });

  it('revokes an active invite', async () => {
    inviteRepo.findById.mockResolvedValue(makeInvite());
    inviteRepo.revoke.mockResolvedValue(undefined);

    await expect(
      useCase.execute({ inviteId: 'invite-1', organizationId: 'org-1' }),
    ).resolves.toBeUndefined();

    expect(inviteRepo.findById).toHaveBeenCalledWith('invite-1', 'org-1');
    expect(inviteRepo.revoke).toHaveBeenCalledWith('invite-1');
  });

  it('throws NotFoundException when invite not found', async () => {
    inviteRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ inviteId: 'missing', organizationId: 'org-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException with correct code', async () => {
    inviteRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ inviteId: 'missing', organizationId: 'org-1' }),
    ).rejects.toMatchObject({ code: 'INVITE_NOT_FOUND' });
  });

  it('throws UnprocessableException when invite is already accepted', async () => {
    inviteRepo.findById.mockResolvedValue(makeInvite({ acceptedAt: new Date() }));

    await expect(
      useCase.execute({ inviteId: 'invite-1', organizationId: 'org-1' }),
    ).rejects.toBeInstanceOf(UnprocessableException);
  });

  it('throws UnprocessableException when invite is already revoked', async () => {
    inviteRepo.findById.mockResolvedValue(makeInvite({ revokedAt: new Date() }));

    await expect(
      useCase.execute({ inviteId: 'invite-1', organizationId: 'org-1' }),
    ).rejects.toBeInstanceOf(UnprocessableException);
  });

  it('throws UnprocessableException with correct code', async () => {
    inviteRepo.findById.mockResolvedValue(makeInvite({ acceptedAt: new Date() }));

    await expect(
      useCase.execute({ inviteId: 'invite-1', organizationId: 'org-1' }),
    ).rejects.toMatchObject({ code: 'INVITE_ALREADY_USED' });
  });

  it('does not call revoke when invite is already used', async () => {
    inviteRepo.findById.mockResolvedValue(makeInvite({ revokedAt: new Date() }));

    await expect(
      useCase.execute({ inviteId: 'invite-1', organizationId: 'org-1' }),
    ).rejects.toBeInstanceOf(UnprocessableException);

    expect(inviteRepo.revoke).not.toHaveBeenCalled();
  });
});
