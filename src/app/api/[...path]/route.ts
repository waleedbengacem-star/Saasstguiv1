import { NextRequest, NextResponse } from 'next/server';

async function catchAll(request: NextRequest, { params }: { params: Promise<{ path: string[] }> | { path: string[] } }) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;
  if (!backendUrl) {
    return NextResponse.json({ error: 'Backend API URL not configured' }, { status: 500 });
  }

  // Resolve params (Next.js 15/16 App Router requires awaiting params)
  const resolvedParams = await params;
  const path = resolvedParams.path.join('/');
  const searchParams = request.nextUrl.search;
  const targetUrl = `${backendUrl}/api/${path}${searchParams}`;

  console.log(`[API Proxy] Forwarding request to: ${targetUrl}`);

  // Copy request headers
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    // Skip host header to prevent target mismatch
    if (key.toLowerCase() !== 'host') {
      headers.set(key, value);
    }
  });

  try {
    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
      redirect: 'manual',
    };

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      const bodyText = await request.text();
      if (bodyText) {
        fetchOptions.body = bodyText;
      }
    }

    const res = await fetch(targetUrl, fetchOptions);

    // Copy response headers
    const resHeaders = new Headers();
    res.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'transfer-encoding') {
        resHeaders.set(key, value);
      }
    });

    const responseBody = await res.text();
    return new NextResponse(responseBody, {
      status: res.status,
      headers: resHeaders,
    });
  } catch (err: any) {
    console.error(`[API Proxy] Error proxying to backend:`, err);
    return NextResponse.json({ error: 'Proxy failed to connect to backend', details: err.message }, { status: 502 });
  }
}

export const GET = catchAll;
export const POST = catchAll;
export const PUT = catchAll;
export const PATCH = catchAll;
export const DELETE = catchAll;
export const OPTIONS = catchAll;
export const dynamic = 'force-dynamic';
