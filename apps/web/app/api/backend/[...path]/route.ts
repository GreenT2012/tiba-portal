import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

async function proxy(request: NextRequest, path: string[]) {
  const backendBaseUrl = process.env.BACKEND_BASE_URL;
  if (!backendBaseUrl) {
    return NextResponse.json({ error: 'BACKEND_BASE_URL is not configured' }, { status: 500 });
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.accessToken || typeof token.accessToken !== 'string') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const targetUrl = new URL(`${backendBaseUrl.replace(/\/$/, '')}/${path.join('/')}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

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

  if (responseType.includes('application/json')) {
    const json = await upstream.json();
    return NextResponse.json(json, { status: upstream.status });
  }

  const text = await upstream.text();
  return new NextResponse(text, { status: upstream.status });
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(request, params.path);
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(request, params.path);
}

export async function PATCH(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(request, params.path);
}
