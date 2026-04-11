/**
 * BFF: /api/admin/finance
 *
 * ?view=summary          → GET /api/admin/finance/summary
 * ?view=daily&days=N     → GET /api/admin/finance/daily?days=N
 * ?view=refunds&page=N   → GET /api/admin/finance/refunds?page=N&limit=N
 * ?view=reconciliation   → GET /api/admin/finance/reconciliation
 *
 * v2.3.0 additions:
 * ?view=vendors&status=&type=&page=
 * ?view=invoices&status=&vendor_id=&category=&page=
 * ?view=budgets&year=&status=&page=
 * ?view=expense-claims&status=&employee_id=&category=&page=
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';

const ADMIN = process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3012';
const hdr   = { 'Authorization': `Bearer ${process.env.ADMIN_SECRET ?? ''}` };

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const view = searchParams.get('view') ?? 'summary';

  // Forward all params except 'view'
  const qs = new URLSearchParams();
  for (const [k, v] of searchParams.entries()) {
    if (k !== 'view') qs.set(k, v);
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : '';

  const endpointMap: Record<string, string> = {
    summary:         'summary',
    daily:           'daily',
    refunds:         'refunds',
    reconciliation:  'reconciliation',
    vendors:         'vendors',
    invoices:        'invoices',
    budgets:         'budgets',
    'expense-claims': 'expense-claims',
  };

  const endpoint = endpointMap[view] ?? 'summary';

  try {
    const up = await fetch(`${ADMIN}/api/admin/finance/${endpoint}${suffix}`, {
      headers: hdr,
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    return NextResponse.json(await up.json().catch(() => ({})), { status: up.status });
  } catch {
    return NextResponse.json({ error: 'ADMIN_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
