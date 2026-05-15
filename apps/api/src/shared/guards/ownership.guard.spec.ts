import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RequestContext } from '../context/request.context';
import { CHECK_OWNERSHIP_KEY } from '../decorators/check-ownership.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { type IOwnershipResolver } from '../ownership/ownership-resolver.interface';
import { OwnershipResolverRegistry } from '../ownership/ownership-resolver.registry';

import { OwnershipGuard } from './ownership.guard';
import { MATCHED_SCOPE_KEY } from './permissions.guard';

const makeContext = (
  params: Record<string, string> = {},
  requestExtras: Record<string, unknown> = {},
): ExecutionContext => {
  const req = { params, ...requestExtras };
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
};

describe('OwnershipGuard', () => {
  let guard: OwnershipGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let registry: jest.Mocked<OwnershipResolverRegistry>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;

    registry = {
      get: jest.fn(),
      register: jest.fn(),
    } as unknown as jest.Mocked<OwnershipResolverRegistry>;

    guard = new OwnershipGuard(reflector as unknown as Reflector, registry);
    jest.restoreAllMocks();
  });

  it('passes through public endpoints', async () => {
    reflector.getAllAndOverride.mockImplementation((key) =>
      key === IS_PUBLIC_KEY ? true : undefined,
    );

    await expect(guard.canActivate(makeContext())).resolves.toBe(true);
  });

  it('passes when no @CheckOwnership decorator is present', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === CHECK_OWNERSHIP_KEY) return undefined;
      return undefined;
    });

    await expect(guard.canActivate(makeContext())).resolves.toBe(true);
  });

  it('passes when there is no matched scope (unscoped permission)', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === CHECK_OWNERSHIP_KEY) return { resource: 'school', paramName: 'id' };
      return undefined;
    });

    const ctx = makeContext({ id: 'school-1' });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('delegates to the correct resolver and passes when it returns true', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === CHECK_OWNERSHIP_KEY) return { resource: 'school', paramName: 'id' };
      return undefined;
    });

    const resolver: jest.Mocked<IOwnershipResolver> = {
      canAccess: jest.fn().mockResolvedValue(true),
    };
    registry.get.mockReturnValue(resolver);

    jest.spyOn(RequestContext, 'getOrThrow').mockReturnValue({
      requestId: 'req-1',
      userId: 'user-1',
      organizationId: 'org-1',
      scopedSchoolIds: ['school-1'],
    });

    const ctx = makeContext({ id: 'school-1' }, { [MATCHED_SCOPE_KEY]: 'own-school' });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(registry.get).toHaveBeenCalledWith('school');
    expect(resolver.canAccess).toHaveBeenCalledWith(
      'own-school',
      'school-1',
      expect.objectContaining({ userId: 'user-1' }),
    );
  });

  it('throws ForbiddenException when resolver returns false', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === CHECK_OWNERSHIP_KEY) return { resource: 'school', paramName: 'id' };
      return undefined;
    });

    const resolver: jest.Mocked<IOwnershipResolver> = {
      canAccess: jest.fn().mockResolvedValue(false),
    };
    registry.get.mockReturnValue(resolver);

    jest.spyOn(RequestContext, 'getOrThrow').mockReturnValue({
      requestId: 'req-1',
      userId: 'user-1',
      organizationId: 'org-1',
      scopedSchoolIds: [],
    });

    const ctx = makeContext({ id: 'school-2' }, { [MATCHED_SCOPE_KEY]: 'own-school' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when no resolver is registered for the resource', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === CHECK_OWNERSHIP_KEY) return { resource: 'unknown', paramName: 'id' };
      return undefined;
    });
    registry.get.mockReturnValue(undefined);

    jest.spyOn(RequestContext, 'getOrThrow').mockReturnValue({
      requestId: 'req-1',
      userId: 'user-1',
      organizationId: 'org-1',
    });

    const ctx = makeContext({ id: 'res-1' }, { [MATCHED_SCOPE_KEY]: 'own-school' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });
});
