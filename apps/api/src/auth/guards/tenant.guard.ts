import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthUser } from '../auth-user.interface';
import { IS_PUBLIC_KEY, REQUIRE_TENANT_KEY } from '../auth.constants';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const requiresTenant = this.reflector.getAllAndOverride<boolean>(REQUIRE_TENANT_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requiresTenant) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authenticated user not available');
    }

    const isInternalUser = user.roles.includes('tiba_agent') || user.roles.includes('tiba_admin');
    if (isInternalUser) {
      return true;
    }

    const isCustomerUser = user.roles.includes('customer_user');

    if (isCustomerUser && !user.customerId) {
      throw new ForbiddenException('customer_id claim is required for customer_user');
    }

    return true;
  }
}
