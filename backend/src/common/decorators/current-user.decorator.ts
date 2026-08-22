import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { AccessTokenPayload } from '../../modules/auth/types/auth.types';
import type { AuthenticatedRequest } from '../guards/jwt-auth.guard';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccessTokenPayload | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    return request.user;
  },
);
