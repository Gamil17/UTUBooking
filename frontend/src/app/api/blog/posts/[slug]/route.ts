/**
 * GET /api/blog/posts/[slug] — public single blog post by slug (includes sections)
 *
 * No auth required. Returns 404 if not found or not published.
 */

import { NextRequest, NextResponse } from 'next/server';

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    const upstream = await fetch(`${AUTH_SERVICE}/api/blog/${encodeURIComponent(slug)}`, {
      cache:  'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
