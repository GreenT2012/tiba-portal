import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { ListUsersDto } from './dto/list-users.dto';
import { UsersService } from './users.service';

function jsonResponse(body: unknown, options?: { ok?: boolean; status?: number; headers?: Record<string, string> }) {
  const ok = options?.ok ?? true;
  const status = options?.status ?? (ok ? 200 : 500);
  return {
    ok,
    status,
    headers: {
      get: (name: string) => options?.headers?.[name.toLowerCase()] ?? options?.headers?.[name] ?? null
    },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body))
  };
}

describe('UsersService', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      KEYCLOAK_ISSUER: 'http://localhost:8080/realms/tiba',
      KEYCLOAK_ADMIN_CLIENT_ID: 'admin-cli',
      KEYCLOAK_ADMIN_CLIENT_SECRET: 'secret',
      KEYCLOAK_ADMIN_REALM: 'tiba'
    };
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('fetches users with query and maps camelCase fields', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ access_token: 'admin-token' }))
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: 'u1',
            username: 'agent1',
            email: 'agent1@example.com',
            firstName: 'Agent',
            lastName: 'One'
          }
        ])
      );

    const service = new UsersService({ customer: { findUnique: jest.fn() } } as any);
    const result = await service.listUsers({ q: 'agent' } as ListUsersDto);

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8080/realms/tiba/protocol/openid-connect/token',
      expect.objectContaining({ method: 'POST' })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8080/admin/realms/tiba/users?max=20&search=agent',
      expect.objectContaining({ headers: { Authorization: 'Bearer admin-token' } })
    );

    expect(result).toEqual([
      {
        id: 'u1',
        username: 'agent1',
        email: 'agent1@example.com',
        firstName: 'Agent',
        lastName: 'One'
      }
    ]);
  });

  it('uses role users endpoint and filters by q for role searches', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ access_token: 'admin-token' }))
      .mockResolvedValueOnce(
        jsonResponse([
          { id: 'u1', username: 'agent1', email: 'agent1@example.com' },
          { id: 'u2', username: 'someone', email: 'someone@example.com' }
        ])
      );

    const service = new UsersService({ customer: { findUnique: jest.fn() } } as any);
    const result = await service.listUsers({ role: 'tiba_agent', q: 'agent', limit: '50' });

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8080/admin/realms/tiba/roles/tiba_agent/users?max=50',
      expect.any(Object)
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('u1');
  });

  it('throws when limit is invalid', async () => {
    const service = new UsersService({ customer: { findUnique: jest.fn() } } as any);

    await expect(service.listUsers({ limit: '0' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when keycloak token call fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 500 }));

    const service = new UsersService({ customer: { findUnique: jest.fn() } } as any);

    await expect(service.listUsers({})).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('fetches user by id and maps fields', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ access_token: 'admin-token' }))
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'u1',
          username: 'agent1',
          email: 'agent1@example.com',
          firstName: 'Agent',
          lastName: 'One'
        })
      );

    const service = new UsersService({ customer: { findUnique: jest.fn() } } as any);
    const result = await service.getUserById('u1');

    expect(result).toEqual({
      id: 'u1',
      username: 'agent1',
      email: 'agent1@example.com',
      firstName: 'Agent',
      lastName: 'One'
    });
  });

  it('rejects provisioning customer_user without customerId', async () => {
    const prisma = { customer: { findUnique: jest.fn() } };
    const service = new UsersService(prisma as any);

    await expect(
      service.provisionUser({
        email: 'new.user@example.com',
        roles: ['customer_user']
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('provisions user and assigns roles in keycloak sequence', async () => {
    const prisma = { customer: { findUnique: jest.fn().mockResolvedValue({ id: 'c1' }) } };
    const service = new UsersService(prisma as any);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ access_token: 'admin-token' }))
      .mockResolvedValueOnce(
        jsonResponse({}, {
          status: 201,
          headers: { location: 'http://localhost:8080/admin/realms/tiba/users/u-new' }
        })
      )
      .mockResolvedValueOnce(jsonResponse({ id: 'r1', name: 'customer_user' }))
      .mockResolvedValueOnce(jsonResponse({}, { status: 204 }));

    const result = await service.provisionUser({
      email: 'new.user@example.com',
      firstName: 'New',
      lastName: 'User',
      customerId: 'c1',
      roles: ['customer_user']
    });

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8080/admin/realms/tiba/users',
      expect.objectContaining({ method: 'POST' })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      'http://localhost:8080/admin/realms/tiba/roles/customer_user',
      expect.any(Object)
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      4,
      'http://localhost:8080/admin/realms/tiba/users/u-new/role-mappings/realm',
      expect.objectContaining({ method: 'POST' })
    );
    expect(result).toMatchObject({
      id: 'u-new',
      username: 'new.user',
      email: 'new.user@example.com',
      customerId: 'c1',
      roles: ['customer_user']
    });
  });

  it('throws gateway error when reset password call fails', async () => {
    const prisma = { customer: { findUnique: jest.fn() } };
    const service = new UsersService(prisma as any);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ access_token: 'admin-token' }))
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'boom',
        headers: { get: () => null }
      });

    await expect(
      service.resetPassword('u1', { temporaryPassword: 'Temp-12345' })
    ).rejects.toBeInstanceOf(BadGatewayException);
  });
});
