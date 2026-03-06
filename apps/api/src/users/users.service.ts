import { BadGatewayException, BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListUsersDto } from './dto/list-users.dto';
import { ProvisionUserDto } from './dto/provision-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ProvisionedUserDto, ResetPasswordResponseDto, UserDto } from './users.types';

type KeycloakTokenResponse = {
  access_token?: string;
};

type KeycloakUser = {
  id: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  attributes?: Record<string, string[] | undefined>;
};

type KeycloakRoleRepresentation = {
  id: string;
  name: string;
};

const ALLOWED_ROLES = new Set(['customer_user', 'tiba_agent', 'tiba_admin']);

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

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

  async provisionUser(dto: ProvisionUserDto): Promise<ProvisionedUserDto> {
    const email = dto.email?.trim().toLowerCase();
    if (!email || !this.isValidEmail(email)) {
      throw new BadRequestException('email must be valid');
    }

    const roles = this.normalizeRoles(dto.roles);
    const customerId = dto.customerId?.trim() || null;
    if (roles.includes('customer_user')) {
      if (!customerId) {
        throw new BadRequestException('customerId is required when roles include customer_user');
      }
      const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) {
        throw new BadRequestException('Customer not found');
      }
    }

    const username = dto.username?.trim() || email.split('@')[0];
    const firstName = dto.firstName?.trim();
    const lastName = dto.lastName?.trim();
    const accessToken = await this.getAdminAccessToken();
    const realm = process.env.KEYCLOAK_ADMIN_REALM ?? 'tiba';
    const base = `${this.getKeycloakBaseUrl()}/admin/realms/${encodeURIComponent(realm)}`;

    const createPayload = {
      username,
      email,
      enabled: true,
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
      attributes: {
        ...(customerId ? { customer_id: [customerId] } : {})
      }
    };

    const createResponse = await fetch(`${base}/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(createPayload)
    });

    if (!createResponse.ok) {
      const body = await createResponse.text();
      this.logger.error(`Keycloak user provisioning failed (${createResponse.status}): ${body}`);
      throw new BadGatewayException('Failed to provision user in Keycloak');
    }

    const location = createResponse.headers.get('location') ?? '';
    const userId = location.split('/').pop();
    if (!userId) {
      throw new BadGatewayException('Failed to determine provisioned user ID');
    }

    const roleRepresentations = await Promise.all(
      roles.map((role) => this.fetchRealmRoleRepresentation(accessToken, base, role))
    );

    const roleMappingResponse = await fetch(`${base}/users/${encodeURIComponent(userId)}/role-mappings/realm`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(roleRepresentations)
    });

    if (!roleMappingResponse.ok) {
      const body = await roleMappingResponse.text();
      this.logger.error(`Keycloak role assignment failed (${roleMappingResponse.status}): ${body}`);
      throw new BadGatewayException('Failed to assign user roles in Keycloak');
    }

    return {
      id: userId,
      username,
      email,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      roles,
      customerId
    };
  }

  async resetPassword(userId: string, dto: ResetPasswordDto): Promise<ResetPasswordResponseDto> {
    const temporaryPassword = dto.temporaryPassword?.trim();
    if (!temporaryPassword) {
      throw new BadRequestException('temporaryPassword is required');
    }

    const accessToken = await this.getAdminAccessToken();
    const realm = process.env.KEYCLOAK_ADMIN_REALM ?? 'tiba';
    const base = `${this.getKeycloakBaseUrl()}/admin/realms/${encodeURIComponent(realm)}`;
    const response = await fetch(`${base}/users/${encodeURIComponent(userId)}/reset-password`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'password',
        temporary: true,
        value: temporaryPassword
      })
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Keycloak reset password failed (${response.status}): ${body}`);
      throw new BadGatewayException('Failed to reset user password in Keycloak');
    }

    return { ok: true };
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

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private normalizeRoles(input: string[] | undefined): string[] {
    if (!Array.isArray(input) || input.length === 0) {
      throw new BadRequestException('roles must be a non-empty array');
    }

    const normalized = [...new Set(input.map((role) => role.trim()).filter(Boolean))];
    if (normalized.length === 0) {
      throw new BadRequestException('roles must be a non-empty array');
    }
    if (normalized.some((role) => !ALLOWED_ROLES.has(role))) {
      throw new BadRequestException('roles must contain only: customer_user, tiba_agent, tiba_admin');
    }
    return normalized;
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

  private async fetchRealmRoleRepresentation(
    accessToken: string,
    base: string,
    roleName: string
  ): Promise<KeycloakRoleRepresentation> {
    const response = await fetch(`${base}/roles/${encodeURIComponent(roleName)}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Keycloak role lookup failed (${response.status}) for ${roleName}: ${body}`);
      throw new BadGatewayException('Failed to resolve role in Keycloak');
    }

    const role = (await response.json()) as KeycloakRoleRepresentation;
    return {
      id: role.id,
      name: role.name
    };
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
