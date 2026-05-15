import { SetMetadata } from '@nestjs/common';

export interface CheckOwnershipOptions {
  resource: string;
  paramName: string;
}

export const CHECK_OWNERSHIP_KEY = 'checkOwnership';
export const CheckOwnership = (options: CheckOwnershipOptions) =>
  SetMetadata(CHECK_OWNERSHIP_KEY, options);
