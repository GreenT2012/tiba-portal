import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { AuthUser } from './auth-user.interface';

type JwtPayload = {
  sub?: string;
  email?: string;
  aud?: string | string[];
  customer_id?: string;
  realm_access?: {
    roles?: string[];
  };
  resource_access?: Record<string, { roles?: string[] }>;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly audience = process.env.KEYCLOAK_AUDIENCE;

  constructor() {
    const issuer = process.env.KEYCLOAK_ISSUER;

    if (!issuer) {
      throw new Error('KEYCLOAK_ISSUER is required');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      issuer,
      algorithms: ['RS256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri: `${issuer.replace(/\/$/, '')}/protocol/openid-connect/certs`
      })
    });
  }

  validate(payload: JwtPayload): AuthUser {
    if (!payload.sub) {
      throw new UnauthorizedException('Token subject (sub) is missing');
    }

    if (this.audience) {
      const audClaim = payload.aud;
      const audiences = Array.isArray(audClaim) ? audClaim : audClaim ? [audClaim] : [];
      if (!audiences.includes(this.audience)) {
        throw new UnauthorizedException('Token audience is invalid');
      }
    }

    const roles = this.extractRoles(payload);

    return {
      sub: payload.sub,
      roles,
      customerId: payload.customer_id ?? null,
      email: payload.email ?? null
    };
  }

  private extractRoles(payload: JwtPayload): string[] {
    const realmRoles = payload.realm_access?.roles ?? [];
    const resourceRoles = Object.values(payload.resource_access ?? {}).flatMap((entry) => entry.roles ?? []);
    return [...new Set([...realmRoles, ...resourceRoles])];
  }
}
