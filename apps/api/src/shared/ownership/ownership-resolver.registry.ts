import { Injectable } from '@nestjs/common';

import { type IOwnershipResolver } from './ownership-resolver.interface';

@Injectable()
export class OwnershipResolverRegistry {
  private readonly resolvers = new Map<string, IOwnershipResolver>();

  register(resource: string, resolver: IOwnershipResolver): void {
    this.resolvers.set(resource, resolver);
  }

  get(resource: string): IOwnershipResolver | undefined {
    return this.resolvers.get(resource);
  }
}
