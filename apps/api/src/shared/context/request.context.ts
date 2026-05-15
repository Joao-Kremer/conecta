import { AsyncLocalStorage } from 'node:async_hooks';

export interface IRequestContext {
  requestId: string;
  userId?: string;
  organizationId?: string;
  roles?: string[];
  permissions?: string[];
  scopedSchoolIds?: string[];
  coachedClassIds?: string[];
  guardianIds?: string[];
}

const storage = new AsyncLocalStorage<IRequestContext>();

export class RequestContext {
  static run<T>(ctx: IRequestContext, fn: () => T): T {
    return storage.run(ctx, fn);
  }

  static get(): IRequestContext | undefined {
    return storage.getStore();
  }

  static getOrThrow(): IRequestContext {
    const ctx = storage.getStore();
    if (!ctx) throw new Error('No RequestContext — was the request middleware skipped?');
    return ctx;
  }
}
