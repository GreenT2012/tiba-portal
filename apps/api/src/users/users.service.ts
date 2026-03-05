import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { ListUsersDto } from './dto/list-users.dto';
import { UserDto } from './users.types';

type KeycloakTokenResponse = {
  access_token?: string;
};

type KeycloakUser = {
  id: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

@Injectable()
export class UsersService {
  async listUsers(query: ListUsersDto): Promise<UserDto[]> {
    const limit = this.parseLimit(query.limit);
    const accessToken = await this.getAdminAccessToken();
    const users = await this.fetchUsers(accessToken, {
      q: query.q?.trim(),
      role: query.role?.trim(),
      limit
    });

    return users.map((user) => this.toUserDto(user));
  }

  async getUserById(userId: string): Promise<UserDto | null> {
    const accessToken = await this.getAdminAccessToken();
    const realm = process.env.KEYCLOAK_ADMIN_REALM ?? 'tiba';
    const base = `${this.getKeycloakBaseUrl()}/admin/realms/${encodeURIComponent(realm)}`;
    const url = `${base}/users/${encodeURIComponent(userId)}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new BadGatewayException('Failed to fetch user from Keycloak admin API');
    }

    const user = (await response.json()) as KeycloakUser;
    return this.toUserDto(user);
  }

  private parseLimit(rawLimit: string | undefined): number {
    if (rawLimit === undefined) {
      return 20;
    }

    const parsed = Number.parseInt(rawLimit, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      throw new BadRequestException('limit must be a positive integer');
    }

    return Math.min(parsed, 50);
  }

  private async getAdminAccessToken(): Promise<string> {
    const clientId = process.env.KEYCLOAK_ADMIN_CLIENT_ID;
    const clientSecret = process.env.KEYCLOAK_ADMIN_CLIENT_SECRET;
    const realm = process.env.KEYCLOAK_ADMIN_REALM ?? 'tiba';

    if (!clientId || !clientSecret) {
      throw new BadGatewayException('Keycloak admin client credentials are not configured');
    }

    const tokenUrl = `${this.getKeycloakBaseUrl()}/realms/${encodeURIComponent(realm)}/protocol/openid-connect/token`;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    if (!response.ok) {
      throw new BadGatewayException('Failed to obtain Keycloak admin access token');
    }

    const json = (await response.json()) as KeycloakTokenResponse;
    if (!json.access_token) {
      throw new BadGatewayException('Keycloak admin token response missing access_token');
    }

    return json.access_token;
  }

  private async fetchUsers(
    accessToken: string,
    options: { q?: string; role?: string; limit: number }
  ): Promise<KeycloakUser[]> {
    const realm = process.env.KEYCLOAK_ADMIN_REALM ?? 'tiba';
    const base = `${this.getKeycloakBaseUrl()}/admin/realms/${encodeURIComponent(realm)}`;

    const url = options.role
      ? `${base}/roles/${encodeURIComponent(options.role)}/users?max=${options.limit}`
      : `${base}/users?max=${options.limit}${options.q ? `&search=${encodeURIComponent(options.q)}` : ''}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      throw new BadGatewayException('Failed to fetch users from Keycloak admin API');
    }

    const users = (await response.json()) as KeycloakUser[];

    if (options.role && options.q) {
      const search = options.q.toLowerCase();
      return users
        .filter((user) => {
          const username = user.username?.toLowerCase() ?? '';
          const email = user.email?.toLowerCase() ?? '';
          return username.includes(search) || email.includes(search);
        })
        .slice(0, options.limit);
    }

    return users.slice(0, options.limit);
  }

  private getKeycloakBaseUrl(): string {
    const configuredBaseUrl = process.env.KEYCLOAK_BASE_URL;
    if (configuredBaseUrl) {
      return configuredBaseUrl.replace(/\/$/, '');
    }

    const issuer = process.env.KEYCLOAK_ISSUER;
    if (!issuer) {
      throw new BadGatewayException('KEYCLOAK_ISSUER is not configured');
    }

    const trimmedIssuer = issuer.replace(/\/$/, '');
    const withoutRealmPath = trimmedIssuer.replace(/\/realms\/[^/]+$/, '');
    if (withoutRealmPath !== trimmedIssuer) {
      return withoutRealmPath;
    }

    const parsed = new URL(trimmedIssuer);
    return parsed.origin;
  }

  private toUserDto(user: KeycloakUser): UserDto {
    return {
      id: user.id,
      username: user.username ?? null,
      email: user.email ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null
    };
  }
}
