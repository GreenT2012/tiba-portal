import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { signOut } from '@/auth';

function getSafePostLogoutRedirect() {
  const configured = process.env.NEXTAUTH_URL;
  if (configured && /^https?:\/\//.test(configured)) {
    return configured.replace(/\/$/, '');
  }
  return 'http://localhost:3000';
}

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const idToken = typeof token?.idToken === 'string' ? token.idToken : null;
  const issuer = process.env.KEYCLOAK_ISSUER?.replace(/\/$/, '');
  const postLogoutRedirect = getSafePostLogoutRedirect();

  await signOut({ redirect: false });

  if (!issuer || !idToken) {
    return NextResponse.redirect(new URL(postLogoutRedirect, request.url));
  }

  const logoutUrl =
    `${issuer}/protocol/openid-connect/logout` +
    `?id_token_hint=${encodeURIComponent(idToken)}` +
    `&post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirect)}`;
  return NextResponse.redirect(logoutUrl);
}
