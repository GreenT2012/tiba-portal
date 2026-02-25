import 'reflect-metadata';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

class RolesTestController {
  @Roles('tiba_admin')
  adminOnly() {
    return true;
  }
}

function createContext(userRoles: string[]): ExecutionContext {
  const request = { user: { roles: userRoles } };

  return {
    switchToHttp: () => ({
      getRequest: () => request
    }),
    getHandler: () => RolesTestController.prototype.adminOnly,
    getClass: () => RolesTestController
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('throws 403 when required role is missing', () => {
    const guard = new RolesGuard(new Reflector());
    const context = createContext(['customer_user']);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows access when required role is present', () => {
    const guard = new RolesGuard(new Reflector());
    const context = createContext(['tiba_admin']);

    expect(guard.canActivate(context)).toBe(true);
  });
});
