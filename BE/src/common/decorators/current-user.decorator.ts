import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest, AuthUser } from '@app-types/auth.types';

export const CurrentUser = createParamDecorator(
  (property: keyof AuthUser | undefined, context: ExecutionContext) => {
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    return property ? user?.[property] : user;
  },
);
