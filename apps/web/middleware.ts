import { NextResponse } from 'next/server';
import { auth } from './auth';

export default auth((req) => {
  if (req.auth) {
    return NextResponse.next();
  }

  const signinUrl = new URL('/api/auth/signin', req.url);
  signinUrl.searchParams.set('callbackUrl', req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(signinUrl);
});

export const config = {
  matcher: ['/dashboard/:path*', '/tickets/:path*']
};
