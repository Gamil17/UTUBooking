import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const ADMIN_SERVICE = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const hdr = { Authorization: `Bearer ${process.env.ADMIN_SECRET ?? ''}` };

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const r = await fetch(`${ADMIN_SERVICE}/api/admin/advertising/enquiries/${id}`, {
      method:  'PATCH',
      headers: { ...hdr, 'Content-Type': 'application/json' },
      body:   JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
    });

    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  } catch (err) {
    console.error('[admin/advertising/enquiries] PATCH error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
