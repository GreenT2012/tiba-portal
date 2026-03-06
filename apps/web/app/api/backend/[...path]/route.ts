import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { buildApiErrorEnvelope } from '@/lib/api';
import { normalizeProxyResponse } from '@/lib/bff';

async function proxy(request: NextRequest, path: string[]) {
  try {
    const backendBaseUrl = process.env.BACKEND_BASE_URL;
    if (!backendBaseUrl) {
      return NextResponse.json(
        buildApiErrorEnvelope(500, 'BACKEND_BASE_URL is not configured'),
        { status: 500 }
      );
    }

    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.accessToken || typeof token.accessToken !== 'string') {
      return NextResponse.json(buildApiErrorEnvelope(401, 'Unauthorized'), { status: 401 });
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

    const normalized = normalizeProxyResponse({
      status: upstream.status,
      contentType: responseType,
      raw,
      statusText: upstream.statusText
    });

    if (normalized.kind === 'json') {
      return NextResponse.json(normalized.body, { status: normalized.status });
    }

    const passthroughHeaders = new Headers();
    if (normalized.contentType) {
      passthroughHeaders.set('content-type', normalized.contentType);
    }

    return new NextResponse(normalized.body, {
      status: normalized.status,
      headers: passthroughHeaders
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      console.error('[BFF] Proxy failure', error);
    }
    return NextResponse.json(
      buildApiErrorEnvelope(500, 'BFF proxy failed', { detail: message }),
      { status: 500 }
    );
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
