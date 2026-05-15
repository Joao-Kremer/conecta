import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { RequestContext } from '../context/request.context';

export const CurrentUser = createParamDecorator((_data: unknown, _ctx: ExecutionContext) => {
  return RequestContext.getOrThrow();
});
