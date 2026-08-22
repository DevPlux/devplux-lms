import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type {
  AuthenticatedRequest,
  JwtPayload,
} from '../guards/jwt-auth.guard';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    return request.user;
  },
);
