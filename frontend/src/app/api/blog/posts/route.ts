/**
 * GET /api/blog/posts — public list of published blog posts (no sections)
 *
 * No auth required. Proxies to AUTH_SERVICE /api/blog.
 */

import { NextResponse } from 'next/server';

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';

export const revalidate = 3600; // 1 hour

export async function GET() {
  try {
    const upstream = await fetch(`${AUTH_SERVICE}/api/blog`, {
      cache:  'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    const data = await upstream.json().catch(() => ({ data: [] }));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}
