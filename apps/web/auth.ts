import NextAuth from 'next-auth';
import Keycloak from 'next-auth/providers/keycloak';

type AccessTokenClaims = {
  sub?: string;
  email?: string;
  customer_id?: string;
  realm_access?: {
    roles?: string[];
  };
  resource_access?: Record<string, { roles?: string[] }>;
};

function parseJwtClaims(token: string): AccessTokenClaims | null {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(payload) as AccessTokenClaims;
  } catch {
    return null;
  }
}

function extractRoles(claims: AccessTokenClaims | null): string[] {
  if (!claims) {
    return [];
  }

  const realmRoles = claims.realm_access?.roles ?? [];
  if (realmRoles.length > 0) {
    return [...new Set(realmRoles)];
  }

  const resourceRoles = Object.values(claims.resource_access ?? {}).flatMap((entry) => entry.roles ?? []);
  return [...new Set(resourceRoles)];
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      issuer: process.env.KEYCLOAK_ISSUER,
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;

        const claims = parseJwtClaims(account.access_token);
        token.roles = extractRoles(claims);
        token.customerId = claims?.customer_id ?? null;
        token.sub = claims?.sub ?? token.sub;
        token.email = claims?.email ?? token.email;
      }

      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        sub: typeof token.sub === 'string' ? token.sub : ''
      };

      session.roles = Array.isArray(token.roles) ? (token.roles as string[]) : [];
      session.customerId = typeof token.customerId === 'string' ? token.customerId : null;
      session.user.email = typeof token.email === 'string' ? token.email : null;

      return session;
    }
  }
});
