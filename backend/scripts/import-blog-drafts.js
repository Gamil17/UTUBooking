#!/usr/bin/env node
'use strict';

/**
 * import-blog-drafts.js
 *
 * Parses every Markdown file in marketing/blog-drafts/ and imports it into
 * the blog CMS via the admin API at /api/admin/blog.
 *
 * Usage:
 *   cd backend
 *   ADMIN_SECRET=your_secret node scripts/import-blog-drafts.js
 *
 * Options (env vars):
 *   ADMIN_SECRET      — required (must match the running auth service)
 *   AUTH_SERVICE_URL  — defaults to http://localhost:3001
 *   DRY_RUN=1         — print what would be imported without posting
 *   PUBLISH=1         — set is_published=true on all imported posts (default: false)
 *   OVERWRITE=1       — PATCH existing posts instead of skipping them
 *
 * The script is idempotent by default: if a post with the same slug already
 * exists (409 SLUG_CONFLICT) it is skipped unless OVERWRITE=1 is set.
 *
 * Markdown structure expected:
 *   ---
 *   title: "Post Title"
 *   date: YYYY-MM-DD
 *   utm_campaign: slug-used-as-cms-slug
 *   language: EN | AR
 *   ---
 *   # H1 Title (skipped — title comes from frontmatter)
 *   Intro paragraph(s) — becomes excerpt (first 250 chars)
 *   ---
 *   ## Section Heading
 *   Body content...
 *   ---
 *   ## Section Heading 2
 *   Body content...
 */

const fs   = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────

const ADMIN_SECRET      = process.env.ADMIN_SECRET;
const AUTH_SERVICE_URL  = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';
const DRY_RUN           = process.env.DRY_RUN === '1';
const PUBLISH           = process.env.PUBLISH === '1';
const OVERWRITE         = process.env.OVERWRITE === '1';

if (!ADMIN_SECRET && !DRY_RUN) {
  console.error('ERROR: ADMIN_SECRET env var is required. Set it or run with DRY_RUN=1.');
  process.exit(1);
}

const DRAFTS_DIR = path.resolve(__dirname, '..', '..', 'marketing', 'blog-drafts');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse YAML-ish frontmatter (key: value, no nested objects).
 * Strips surrounding quotes from values.
 */
function parseFrontmatter(text) {
  const meta   = {};
  const lines  = text.split('\n');
  for (const line of lines) {
    const match = line.match(/^(\w[\w_-]*):\s*(.+)$/);
    if (match) {
      let val = match[2].trim();
      // Strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      meta[match[1]] = val;
    }
  }
  return meta;
}

/**
 * Estimate reading time in minutes (200 wpm average).
 */
function estimateReadTime(text) {
  const words = text.trim().split(/\s+/).length;
  const mins  = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

/**
 * Parse a markdown file into a CMS post object.
 * Returns null if the file cannot be parsed.
 */
function parseMarkdownPost(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');

  // ── Extract frontmatter ─────────────────────────────────────────────────────
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    console.warn(`  SKIP: ${path.basename(filePath)} — no valid frontmatter`);
    return null;
  }

  const meta    = parseFrontmatter(fmMatch[1]);
  const body    = fmMatch[2];

  const title     = meta.title;
  const date      = meta.date;
  const language  = (meta.language ?? 'EN').toUpperCase();
  // Prefer utm_campaign as slug (already kebab-case), fall back to title-derived
  const slug      = (meta.utm_campaign ?? title.toLowerCase().replace(/[^a-z0-9]+/g, '-')).trim();
  const category  = language === 'AR' ? 'دليل السفر' : 'Travel Guide';

  if (!title || !date || !slug) {
    console.warn(`  SKIP: ${path.basename(filePath)} — missing title, date, or slug`);
    return null;
  }

  // ── Split body on --- separators ────────────────────────────────────────────
  // First block = intro (skip the H1 line at top)
  const blocks = body.split(/\n---+\n/);
  const introBlock = (blocks[0] ?? '')
    .split('\n')
    .filter(line => !line.startsWith('# '))  // remove H1
    .join('\n')
    .trim();

  // ── Build excerpt from intro ────────────────────────────────────────────────
  // Strip markdown syntax and take first 250 chars
  const excerptRaw = introBlock
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // links → text only
    .replace(/\*\*([^*]+)\*\*/g, '$1')         // bold → plain
    .replace(/^-\s+/gm, '')                    // bullets
    .replace(/\n+/g, ' ')
    .trim();
  const excerpt = excerptRaw.slice(0, 250).replace(/\s+\S*$/, '').trim();

  // ── Parse sections from subsequent blocks ───────────────────────────────────
  const sections = [];
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block) continue;

    const lines  = block.split('\n');
    const h2Line = lines.find(l => l.startsWith('## '));
    if (!h2Line) continue;

    const heading  = h2Line.replace(/^##\s*/, '').trim();
    const bodyText = lines
      .filter(l => !l.startsWith('## '))
      .join('\n')
      .trim();

    if (heading && bodyText) {
      sections.push({ heading, body: bodyText });
    }
  }

  if (sections.length === 0) {
    console.warn(`  SKIP: ${path.basename(filePath)} — no parseable sections`);
    return null;
  }

  // ── Reading time estimate ───────────────────────────────────────────────────
  const fullText  = sections.map(s => `${s.heading}\n${s.body}`).join('\n\n');
  const readTime  = estimateReadTime(fullText);

  // Format date as "10 Apr 2026"
  const pubDate = new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return {
    slug,
    title,
    category,
    excerpt,
    published_date: pubDate,
    read_time:      readTime,
    sections,
    is_published:   PUBLISH,
    sort_order:     0,
    _language:      language,
    _file:          path.basename(filePath),
  };
}

// ── API calls ─────────────────────────────────────────────────────────────────

const HEADERS = {
  'Content-Type':   'application/json',
  'x-admin-secret': ADMIN_SECRET ?? '',
};

async function createPost(post) {
  const { _language: _l, _file: _f, ...payload } = post;
  const res = await fetch(`${AUTH_SERVICE_URL}/api/admin/blog`, {
    method:  'POST',
    headers: HEADERS,
    body:    JSON.stringify(payload),
    signal:  AbortSignal.timeout(10_000),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function patchPost(id, post) {
  const { _language: _l, _file: _f, ...payload } = post;
  const res = await fetch(`${AUTH_SERVICE_URL}/api/admin/blog/${id}`, {
    method:  'PATCH',
    headers: HEADERS,
    body:    JSON.stringify(payload),
    signal:  AbortSignal.timeout(10_000),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function findExistingPost(slug) {
  const res = await fetch(
    `${AUTH_SERVICE_URL}/api/admin/blog?search=${encodeURIComponent(slug)}&limit=1`,
    { headers: HEADERS, signal: AbortSignal.timeout(5_000) },
  );
  if (!res.ok) return null;
  const json = await res.json().catch(() => ({}));
  return (json.data ?? []).find(p => p.slug === slug) ?? null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== UTUBooking Blog Draft Importer ===');
  if (DRY_RUN)  console.log('  [DRY RUN — nothing will be posted]\n');
  if (PUBLISH)  console.log('  [PUBLISH=1 — posts will be marked is_published=true]\n');
  if (OVERWRITE) console.log('  [OVERWRITE=1 — existing posts will be updated]\n');

  if (!fs.existsSync(DRAFTS_DIR)) {
    console.error(`ERROR: Drafts directory not found: ${DRAFTS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(DRAFTS_DIR)
    .filter(f => f.endsWith('.md'))
    .sort();

  console.log(`Found ${files.length} markdown file(s) in marketing/blog-drafts/\n`);

  let created   = 0;
  let updated   = 0;
  let skipped   = 0;
  let errored   = 0;

  for (const file of files) {
    const filePath = path.join(DRAFTS_DIR, file);
    console.log(`Processing: ${file}`);

    const post = parseMarkdownPost(filePath);
    if (!post) {
      skipped++;
      continue;
    }

    console.log(`  Title:    ${post.title}`);
    console.log(`  Slug:     ${post.slug}`);
    console.log(`  Category: ${post.category} [${post._language}]`);
    console.log(`  Date:     ${post.published_date}`);
    console.log(`  Sections: ${post.sections.length}`);
    console.log(`  Read:     ${post.read_time}`);
    console.log(`  Excerpt:  ${post.excerpt.slice(0, 80)}…`);

    if (DRY_RUN) {
      console.log('  → [DRY RUN] Would POST to admin blog API\n');
      created++;
      continue;
    }

    try {
      const { status, body } = await createPost(post);

      if (status === 201) {
        console.log(`  ✓ Created (id: ${body.data?.id})\n`);
        created++;
      } else if (status === 409) {
        // Slug conflict
        if (OVERWRITE) {
          const existing = await findExistingPost(post.slug);
          if (existing) {
            const { status: ps, body: pb } = await patchPost(existing.id, post);
            if (ps === 200) {
              console.log(`  ↺ Updated existing post (id: ${existing.id})\n`);
              updated++;
            } else {
              console.warn(`  WARN: PATCH failed (${ps}): ${JSON.stringify(pb)}\n`);
              errored++;
            }
          } else {
            console.warn(`  WARN: 409 but could not find existing post to PATCH\n`);
            errored++;
          }
        } else {
          console.log(`  → Skipped (slug already exists — use OVERWRITE=1 to update)\n`);
          skipped++;
        }
      } else {
        console.error(`  ERROR: ${status} — ${JSON.stringify(body)}\n`);
        errored++;
      }
    } catch (err) {
      console.error(`  ERROR: ${err.message}\n`);
      errored++;
    }
  }

  console.log('=== Summary ===');
  console.log(`  Created:  ${created}`);
  console.log(`  Updated:  ${updated}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Errors:   ${errored}`);
  console.log('================\n');

  if (!DRY_RUN && PUBLISH) {
    console.log('NOTE: Posts were imported as PUBLISHED. Verify on /blog before sharing.');
  } else if (!DRY_RUN) {
    console.log('NOTE: Posts imported as DRAFT (is_published=false).');
    console.log('      Review in Admin → Blog, then set is_published=true to go live.');
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
