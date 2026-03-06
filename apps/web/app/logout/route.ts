import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

function getSafeBaseUrl() {
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
  const baseUrl = getSafeBaseUrl();
  const postLogoutRedirectUri = `${baseUrl}/login`;

  let afterSignout = postLogoutRedirectUri;
  if (issuer && idToken) {
    const endSessionUrl = new URL(`${issuer}/protocol/openid-connect/logout`);
    endSessionUrl.searchParams.set('id_token_hint', idToken);
    endSessionUrl.searchParams.set('post_logout_redirect_uri', postLogoutRedirectUri);
    afterSignout = endSessionUrl.toString();
  }

  const signoutUrl = new URL('/api/auth/signout', request.url);
  signoutUrl.searchParams.set('callbackUrl', afterSignout);
  return NextResponse.redirect(signoutUrl);
}
