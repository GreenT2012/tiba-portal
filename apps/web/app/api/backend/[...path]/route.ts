import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

async function proxy(request: NextRequest, path: string[]) {
  try {
    const backendBaseUrl = process.env.BACKEND_BASE_URL;
    if (!backendBaseUrl) {
      return NextResponse.json({ error: 'BACKEND_BASE_URL is not configured' }, { status: 500 });
    }

    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.accessToken || typeof token.accessToken !== 'string') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const baseUrl = backendBaseUrl.replace(/\/$/, '');
    const safePath = (path ?? []).map((segment) => encodeURIComponent(segment)).join('/');
    const targetUrl = new URL(`${baseUrl}/${safePath}`);
    targetUrl.search = request.nextUrl.search;

    const headers = new Headers();
    headers.set('Authorization', `Bearer ${token.accessToken}`);

    const contentType = request.headers.get('content-type');
    if (contentType) {
      headers.set('content-type', contentType);
    }

    const body = request.method === 'GET' ? undefined : await request.text();

    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body
    });

    const responseType = upstream.headers.get('content-type') ?? '';
    const raw = await upstream.text();

    if (process.env.NODE_ENV === 'development' && upstream.status >= 400) {
      const snippet = raw.slice(0, 500);
      console.error(`[BFF] Upstream ${upstream.status} ${request.method} ${targetUrl.toString()}`);
      console.error(`[BFF] Upstream body: ${snippet}`);
    }

    if (responseType.includes('application/json')) {
      try {
        const parsed = raw ? JSON.parse(raw) : {};
        return NextResponse.json(parsed, { status: upstream.status });
      } catch {
        return new NextResponse(raw, {
          status: upstream.status,
          headers: { 'content-type': 'text/plain; charset=utf-8' }
        });
      }
    }

    const passthroughHeaders = new Headers();
    if (responseType) {
      passthroughHeaders.set('content-type', responseType);
    }

    return new NextResponse(raw, {
      status: upstream.status,
      headers: passthroughHeaders
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      console.error('[BFF] Proxy failure', error);
    }
    return NextResponse.json({ error: 'BFF proxy failed', detail: message }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxy(request, path ?? []);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxy(request, path ?? []);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxy(request, path ?? []);
}
