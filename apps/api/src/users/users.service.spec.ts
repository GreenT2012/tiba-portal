import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { ListUsersDto } from './dto/list-users.dto';
import { UsersService } from './users.service';

function jsonResponse(body: unknown, ok = true) {
  return {
    ok,
    json: async () => body
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

    const service = new UsersService();
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

    const service = new UsersService();
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
    const service = new UsersService();

    await expect(service.listUsers({ limit: '0' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when keycloak token call fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({}, false));

    const service = new UsersService();

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

    const service = new UsersService();
    const result = await service.getUserById('u1');

    expect(result).toEqual({
      id: 'u1',
      username: 'agent1',
      email: 'agent1@example.com',
      firstName: 'Agent',
      lastName: 'One'
    });
  });
});
