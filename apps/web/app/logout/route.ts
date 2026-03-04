import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/api/auth/logout?callbackUrl=/', request.url));
}
