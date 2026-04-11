/**
 * GET /api/admin/crm/proposals          — list all .md files under sales/
 * GET /api/admin/crm/proposals?file=... — read content of a specific file
 *
 * Uses process.cwd()/../sales/ to reach the sales directory from the frontend.
 * path.basename() prevents directory traversal.
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';
import path from 'path';
import fs from 'fs/promises';

const SALES_DIR = path.join(process.cwd(), '..', 'sales');

async function listMdFiles(dir: string, base = ''): Promise<Array<{ path: string; size: number; modified: string }>> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results: Array<{ path: string; size: number; modified: string }> = [];
  for (const e of entries) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) {
      const sub = await listMdFiles(path.join(dir, e.name), rel).catch(() => []);
      results.push(...sub);
    } else if (e.name.endsWith('.md')) {
      const stat = await fs.stat(path.join(dir, e.name)).catch(() => null);
      if (stat) results.push({ path: rel, size: stat.size, modified: stat.mtime.toISOString() });
    }
  }
  return results;
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const file = req.nextUrl.searchParams.get('file');

  try {
    if (file) {
      // Sanitise: only allow paths within SALES_DIR
      const resolved = path.resolve(SALES_DIR, file);
      if (!resolved.startsWith(SALES_DIR)) {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
      }
      const content = await fs.readFile(resolved, 'utf-8');
      const stat    = await fs.stat(resolved);
      // Word count estimate
      const words = content.split(/\s+/).filter(Boolean).length;
      return NextResponse.json({ data: { path: file, content, words, size: stat.size, modified: stat.mtime.toISOString() } });
    }

    const files = await listMdFiles(SALES_DIR);
    files.sort((a, b) => a.path.localeCompare(b.path));
    return NextResponse.json({ data: files, total: files.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'FS_ERROR', message: msg }, { status: 500 });
  }
}
