import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthUser } from './auth-user.interface';

export function isCustomerUser(user: AuthUser): boolean {
  return user.roles.includes('customer_user');
}

export function isInternalUser(user: AuthUser): boolean {
  return user.roles.includes('tiba_agent') || user.roles.includes('tiba_admin');
}

export function isTibaAdmin(user: AuthUser): boolean {
  return user.roles.includes('tiba_admin');
}

export function assertInternalUser(user: AuthUser): void {
  if (isCustomerUser(user)) {
    throw new ForbiddenException('customer_user is not allowed');
  }
  if (!isInternalUser(user)) {
    throw new ForbiddenException('Unsupported role');
  }
}

export function assertTibaAdmin(user: AuthUser): void {
  if (!isTibaAdmin(user)) {
    throw new ForbiddenException('tiba_admin is required');
  }
}

export function assertCustomerTenant(user: AuthUser): string {
  if (!isCustomerUser(user)) {
    throw new ForbiddenException('customer_user is required');
  }
  if (!user.customerId) {
    throw new ForbiddenException('customer_id claim is required for customer_user');
  }
  return user.customerId;
}

export function assertTenantResourceVisible(
  user: AuthUser,
  resource: { customer_id: string } | null,
  label: string
): asserts resource is { customer_id: string } {
  if (!resource) {
    throw new NotFoundException(`${label} not found`);
  }
  if (isCustomerUser(user) && resource.customer_id !== user.customerId) {
    throw new NotFoundException(`${label} not found`);
  }
}
