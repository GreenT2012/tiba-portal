import { userSchema, provisionedUserSchema, type UserContract, type ProvisionedUserContract } from '@tiba/shared/users';
import { z } from 'zod';
import { requestJson } from '../http';

const usersListSchema = z.array(userSchema);
const resetPasswordResponseSchema = z.object({ ok: z.literal(true) });

export type User = UserContract;
export type ProvisionedUser = ProvisionedUserContract;

export async function listUsers(params: { q?: string; role?: string; limit?: number } = {}) {
  const search = new URLSearchParams();
  if (params.q !== undefined) search.set('q', params.q);
  if (params.role) search.set('role', params.role);
  search.set('limit', String(params.limit ?? 20));

  return requestJson(`/api/backend/users?${search.toString()}`, { cache: 'no-store' }, usersListSchema, 'Failed to load users');
}

export async function provisionUser(body: {
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  customerId?: string;
}) {
  return requestJson(
    '/api/backend/users/provision',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    },
    provisionedUserSchema,
    'Failed to create user'
  );
}

export async function resetUserPassword(userId: string, body: { temporaryPassword: string }) {
  return requestJson(
    `/api/backend/users/${userId}/reset-password`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    },
    resetPasswordResponseSchema,
    'Failed to reset password'
  );
}
