import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserModel } from '../users/user.model';

/**
 * Extracts the authenticated user from the request.
 * Usage: @CurrentUser() user: UserModel
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserModel => {
    const request = ctx.switchToHttp().getRequest<{ user: UserModel }>();
    return request.user;
  },
);
