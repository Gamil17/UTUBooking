/**
 * DELETE /api/sales/contacts/[contactId]  — remove a contact
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const SALES = process.env.SALES_SERVICE_URL ?? 'http://localhost:3013';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ contactId: string }> }) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { contactId } = await params;
  try {
    const up = await fetch(`${SALES}/api/sales/contacts/${contactId}`, {
      method:  'DELETE',
      headers: { 'Authorization': `Bearer ${process.env.SALES_SECRET ?? ''}` },
      signal:  AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch { return NextResponse.json({ error: 'SALES_SERVICE_UNAVAILABLE' }, { status: 503 }); }
}
