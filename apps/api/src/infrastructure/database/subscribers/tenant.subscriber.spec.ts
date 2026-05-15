import { ForbiddenException } from '@nestjs/common';
import { type InsertEvent } from 'typeorm';

import { RequestContext } from '../../../shared/context/request.context';

import { TenantSubscriber } from './tenant.subscriber';

const makeInsertEvent = (
  entity: Record<string, unknown>,
  hasOrgIdColumn = true,
): InsertEvent<Record<string, unknown>> =>
  ({
    entity,
    metadata: {
      name: 'TestEntity',
      columns: hasOrgIdColumn ? [{ propertyName: 'organizationId' }] : [],
    },
  }) as unknown as InsertEvent<Record<string, unknown>>;

describe('TenantSubscriber', () => {
  let subscriber: TenantSubscriber;

  beforeEach(() => {
    subscriber = new TenantSubscriber();
    jest.restoreAllMocks();
  });

  describe('beforeInsert', () => {
    it('injects organizationId from context when entity is missing it', () => {
      jest.spyOn(RequestContext, 'get').mockReturnValue({
        requestId: 'req-1',
        organizationId: 'org-1',
      });

      const entity: Record<string, unknown> = { name: 'Test School' };
      subscriber.beforeInsert(makeInsertEvent(entity));

      expect(entity['organizationId']).toBe('org-1');
    });

    it('allows insert when organizationId matches context', () => {
      jest.spyOn(RequestContext, 'get').mockReturnValue({
        requestId: 'req-1',
        organizationId: 'org-1',
      });

      const entity: Record<string, unknown> = { organizationId: 'org-1', name: 'Test' };
      expect(() => subscriber.beforeInsert(makeInsertEvent(entity))).not.toThrow();
      expect(entity['organizationId']).toBe('org-1');
    });

    it('throws ForbiddenException when organizationId does not match context', () => {
      jest.spyOn(RequestContext, 'get').mockReturnValue({
        requestId: 'req-1',
        organizationId: 'org-1',
      });

      const entity: Record<string, unknown> = { organizationId: 'org-2', name: 'Test' };
      expect(() => subscriber.beforeInsert(makeInsertEvent(entity))).toThrow(ForbiddenException);
    });

    it('skips entities that do not have an organizationId column (e.g. Role, Permission)', () => {
      jest.spyOn(RequestContext, 'get').mockReturnValue({
        requestId: 'req-1',
        organizationId: 'org-1',
      });

      const entity: Record<string, unknown> = { key: 'student:read' };
      expect(() => subscriber.beforeInsert(makeInsertEvent(entity, false))).not.toThrow();
      expect(entity['organizationId']).toBeUndefined();
    });

    it('skips injection when there is no active RequestContext (seeding / migrations)', () => {
      jest.spyOn(RequestContext, 'get').mockReturnValue(undefined);

      const entity: Record<string, unknown> = { name: 'Seeded School' };
      expect(() => subscriber.beforeInsert(makeInsertEvent(entity))).not.toThrow();
      expect(entity['organizationId']).toBeUndefined();
    });

    it('skips injection when context has no organizationId', () => {
      jest.spyOn(RequestContext, 'get').mockReturnValue({ requestId: 'req-1' });

      const entity: Record<string, unknown> = { name: 'Seeded' };
      expect(() => subscriber.beforeInsert(makeInsertEvent(entity))).not.toThrow();
      expect(entity['organizationId']).toBeUndefined();
    });
  });
});
