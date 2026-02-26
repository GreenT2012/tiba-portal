import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../auth-user.interface';

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; user?: AuthUser }>();
    const user = request.user;

    if (!user) {
      return null;
    }

    const isInternalUser = user.roles.includes('tiba_agent') || user.roles.includes('tiba_admin');
    if (isInternalUser) {
      const headerValue = request.headers['x-customer-id'];
      return headerValue ?? null;
    }

    return user.customerId;
  }
);
