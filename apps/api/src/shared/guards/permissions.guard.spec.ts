import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RequestContext } from '../context/request.context';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

import { MATCHED_SCOPE_KEY, PermissionsGuard } from './permissions.guard';

const makeContext = (requestStore: Record<string, unknown> = {}): ExecutionContext =>
  ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => requestStore }),
  }) as unknown as ExecutionContext;

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as unknown as jest.Mocked<
      Pick<Reflector, 'getAllAndOverride'>
    >;
    guard = new PermissionsGuard(reflector as unknown as Reflector);
    jest.restoreAllMocks();
  });

  it('passes through public endpoints without checking permissions', () => {
    reflector.getAllAndOverride.mockImplementation((key) =>
      key === IS_PUBLIC_KEY ? true : undefined,
    );
    jest.spyOn(RequestContext, 'get').mockReturnValue(undefined);

    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it('passes when no @RequirePermissions decorator is present', () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === PERMISSIONS_KEY) return undefined;
      return undefined;
    });
    jest.spyOn(RequestContext, 'get').mockReturnValue({
      requestId: 'req-1',
      permissions: [],
    });

    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it('passes when user has ANY one of the required permissions (OR logic)', () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === PERMISSIONS_KEY) return ['student:read', 'student:read.own-school'];
      return undefined;
    });
    jest.spyOn(RequestContext, 'get').mockReturnValue({
      requestId: 'req-1',
      permissions: ['student:read.own-school'],
    });
    const req: Record<string, unknown> = {};

    expect(guard.canActivate(makeContext(req))).toBe(true);
  });

  it('sets MATCHED_SCOPE_KEY to extracted scope when scoped permission matches', () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === PERMISSIONS_KEY) return ['student:read.own-school'];
      return undefined;
    });
    jest.spyOn(RequestContext, 'get').mockReturnValue({
      requestId: 'req-1',
      permissions: ['student:read.own-school'],
    });
    const req: Record<string, unknown> = {};

    guard.canActivate(makeContext(req));

    expect(req[MATCHED_SCOPE_KEY]).toBe('own-school');
  });

  it('does not set MATCHED_SCOPE_KEY for unscoped permission', () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === PERMISSIONS_KEY) return ['student:read'];
      return undefined;
    });
    jest.spyOn(RequestContext, 'get').mockReturnValue({
      requestId: 'req-1',
      permissions: ['student:read'],
    });
    const req: Record<string, unknown> = {};

    guard.canActivate(makeContext(req));

    expect(req[MATCHED_SCOPE_KEY]).toBeUndefined();
  });

  it('throws ForbiddenException when user lacks all required permissions', () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === PERMISSIONS_KEY) return ['student:create', 'student:delete'];
      return undefined;
    });
    jest.spyOn(RequestContext, 'get').mockReturnValue({
      requestId: 'req-1',
      permissions: ['school:read'],
    });

    expect(() => guard.canActivate(makeContext())).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when context has no permissions', () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === PERMISSIONS_KEY) return ['student:read'];
      return undefined;
    });
    jest.spyOn(RequestContext, 'get').mockReturnValue({ requestId: 'req-1' });

    expect(() => guard.canActivate(makeContext())).toThrow(ForbiddenException);
  });

  it('correctly extracts own-class scope', () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === PERMISSIONS_KEY) return ['attendance:create.own-class'];
      return undefined;
    });
    jest.spyOn(RequestContext, 'get').mockReturnValue({
      requestId: 'req-1',
      permissions: ['attendance:create.own-class'],
    });
    const req: Record<string, unknown> = {};

    guard.canActivate(makeContext(req));

    expect(req[MATCHED_SCOPE_KEY]).toBe('own-class');
  });
});
