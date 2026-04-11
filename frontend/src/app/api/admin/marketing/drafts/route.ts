/**
 * GET /api/admin/marketing/drafts
 *
 * Reads all .md files from marketing/blog-drafts/, parses frontmatter,
 * and returns a list of drafts with their metadata.
 *
 * POST /api/admin/marketing/drafts  (body: { filename })
 * Reads one draft file and returns parsed frontmatter + body for import preview.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-bff-auth';
import path from 'path';
import fs   from 'fs';

/** Parse YAML-style frontmatter between --- delimiters */
function parseFrontmatter(content: string): { meta: Record<string, string>; body: string } {
  const meta: Record<string, string> = {};
  const lines = content.split('\n');

  if (lines[0].trim() !== '---') {
    return { meta, body: content };
  }

  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') { endIdx = i; break; }
    const colonIdx = lines[i].indexOf(':');
    if (colonIdx === -1) continue;
    const key = lines[i].slice(0, colonIdx).trim();
    const val = lines[i].slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
    meta[key] = val;
  }

  const body = endIdx > 0 ? lines.slice(endIdx + 1).join('\n').trim() : content;
  return { meta, body };
}

function getDraftsDir() {
  // process.cwd() = frontend/ in Next.js dev; one level up is project root
  return path.join(process.cwd(), '..', 'marketing', 'blog-drafts');
}

function estimateWordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const draftsDir = getDraftsDir();

  if (!fs.existsSync(draftsDir)) {
    return NextResponse.json({ data: [], total: 0 });
  }

  try {
    const files = fs.readdirSync(draftsDir).filter((f) => f.endsWith('.md'));
    const drafts = files.map((filename) => {
      const fullPath = path.join(draftsDir, filename);
      const raw      = fs.readFileSync(fullPath, 'utf-8');
      const { meta, body } = parseFrontmatter(raw);

      return {
        filename,
        title:        meta.title       ?? filename,
        keyword:      meta.keyword     ?? null,
        language:     meta.language    ?? 'EN',
        status:       meta.status      ?? 'DRAFT',
        utm_campaign: meta.utm_campaign ?? null,
        date:         meta.date        ?? null,
        word_count:   estimateWordCount(body),
        size_bytes:   fs.statSync(fullPath).size,
      };
    });

    // Sort by date descending
    drafts.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

    return NextResponse.json({ data: drafts, total: drafts.length });
  } catch (err) {
    console.error('[marketing/drafts GET]', err);
    return NextResponse.json({ error: 'FAILED_TO_READ_DRAFTS' }, { status: 500 });
  }
}

/** POST — return full parsed content of one file */
export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { filename } = await req.json().catch(() => ({}));
  if (!filename || typeof filename !== 'string' || !filename.endsWith('.md')) {
    return NextResponse.json({ error: 'Valid filename required' }, { status: 400 });
  }

  // Prevent path traversal
  const safe = path.basename(filename);
  const fullPath = path.join(getDraftsDir(), safe);

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  try {
    const raw = fs.readFileSync(fullPath, 'utf-8');
    const { meta, body } = parseFrontmatter(raw);
    return NextResponse.json({ data: { filename: safe, meta, body } });
  } catch {
    return NextResponse.json({ error: 'FAILED_TO_READ_FILE' }, { status: 500 });
  }
}
