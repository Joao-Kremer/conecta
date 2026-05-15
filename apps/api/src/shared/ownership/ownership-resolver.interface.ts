import { type IRequestContext } from '../context/request.context';

export type OwnershipScope = 'own-school' | 'own-class' | 'own';

export interface IOwnershipResolver {
  canAccess(scope: OwnershipScope, resourceId: string, ctx: IRequestContext): Promise<boolean>;
}
