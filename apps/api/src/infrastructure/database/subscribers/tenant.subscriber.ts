import { ForbiddenException, Logger } from '@nestjs/common';
import {
  EventSubscriber,
  type EntitySubscriberInterface,
  type InsertEvent,
  type LoadEvent,
} from 'typeorm';

import { RequestContext } from '../../../shared/context/request.context';

@EventSubscriber()
export class TenantSubscriber implements EntitySubscriberInterface {
  private readonly logger = new Logger(TenantSubscriber.name);

  beforeInsert(event: InsertEvent<Record<string, unknown>>): void {
    const entity = event.entity;
    if (!entity) return;

    const hasOrgId = event.metadata.columns.some((c) => c.propertyName === 'organizationId');
    if (!hasOrgId) return;

    const ctx = RequestContext.get();
    if (!ctx?.organizationId) return;

    const entityOrg = entity['organizationId'] as string | undefined | null;

    if (!entityOrg) {
      entity['organizationId'] = ctx.organizationId;
    } else if (entityOrg !== ctx.organizationId) {
      throw new ForbiddenException('Cross-tenant write blocked');
    }
  }

  afterLoad(entity: Record<string, unknown>, event?: LoadEvent<Record<string, unknown>>): void {
    if (!event) return;
    const hasOrgId = event.metadata.columns.some((c) => c.propertyName === 'organizationId');
    if (!hasOrgId) return;
    if (!entity['organizationId']) {
      this.logger.warn(`Entity loaded without organization_id: ${event.metadata.name}`);
    }
  }
}
