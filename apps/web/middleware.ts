import { NextResponse } from 'next/server';
import { auth } from './auth';

export default auth((req) => {
  if (req.auth) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', req.url);
  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: ['/', '/dashboard/:path*', '/tickets/:path*', '/tiba/:path*', '/projects/:path*']
};
