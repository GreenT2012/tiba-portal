import 'reflect-metadata';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TicketsController } from './tickets.controller';

function createContext(userRoles: string[]): ExecutionContext {
  const request = { user: { roles: userRoles } };

  return {
    switchToHttp: () => ({
      getRequest: () => request
    }),
    getHandler: () => TicketsController.prototype.assignTicket,
    getClass: () => TicketsController
  } as unknown as ExecutionContext;
}

describe('TicketsController role protection', () => {
  it('forbids customer_user on assign endpoint', () => {
    const guard = new RolesGuard(new Reflector());
    const context = createContext(['customer_user']);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows tiba_agent on assign endpoint', () => {
    const guard = new RolesGuard(new Reflector());
    const context = createContext(['tiba_agent']);

    expect(guard.canActivate(context)).toBe(true);
  });
});
