import 'reflect-metadata';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequireTenant } from '../decorators/require-tenant.decorator';
import { TenantGuard } from './tenant.guard';

class TenantTestController {
  @RequireTenant()
  tenantScoped() {
    return true;
  }
}

type UserMock = {
  roles: string[];
  customerId: string | null;
};

function createContext(user: UserMock): ExecutionContext {
  const request = { user };

  return {
    switchToHttp: () => ({
      getRequest: () => request
    }),
    getHandler: () => TenantTestController.prototype.tenantScoped,
    getClass: () => TenantTestController
  } as unknown as ExecutionContext;
}

describe('TenantGuard', () => {
  it('throws 403 for customer_user without customerId', () => {
    const guard = new TenantGuard(new Reflector());
    const context = createContext({ roles: ['customer_user'], customerId: null });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows customer_user when customerId exists', () => {
    const guard = new TenantGuard(new Reflector());
    const context = createContext({ roles: ['customer_user'], customerId: 'f7f8f9ea-7bf6-4a9a-84ac-b3e38708f552' });

    expect(guard.canActivate(context)).toBe(true);
  });
});
