# UTUBooking SEO System — Implementation Progress
**Course:** AI Ranking Course (7 Videos) — Part 5: 6-Stage Rollout
**Last updated:** 2026-03-25

---

## 6-Stage Status

| Stage | Name | Status | Notes |
|---|---|---|---|
| 1 | Environment | ✅ Complete | VS Code + Claude Code + GitHub repo at `master` branch |
| 2 | Reference Files | ✅ Complete | All 3 files built and formatted to course spec |
| 3 | Core Skills | ✅ Complete | All 5 SKILL.md files deployed |
| 4 | Command Center | ✅ Complete | .mcp.json wired; GSC venv ready; client_secrets.json needed |
| 5 | First Content | ⏳ Ready to run | Run the Stage 5 prompt below |
| 6 | Monthly Engine | ✅ Built | MONTHLY-ENGINE.md + 90-day calendar ready |

---

## Stage 2 — Reference Files

| File | Location | Status |
|---|---|---|
| Tone of Voice | `skills/seo-content-writer/references/tone-of-voice.md` | ✅ 10 golden sentences + opinion starters added |
| Sitemap CSV | `skills/seo-content-writer/references/sitemap.csv` | ✅ Full URLs + MetaDescription column (24 pages) |
| Experiences | `skills/seo-content-writer/references/experiences.md` | ✅ 5 stories in course-spec format |

---

## Stage 3 — Skills Deployed

| Skill | File | Trigger | Status |
|---|---|---|---|
| seo-content-writer | `skills/seo-content-writer/SKILL.md` | "Write SEO post about [topic]" | ✅ |
| seo-audit | `skills/seo-audit/SKILL.md` | "Audit [URL] for SEO" | ✅ |
| keyword-research | `skills/keyword-research/SKILL.md` | "Keyword research for [topic]" | ✅ |
| geo-optimizer | `skills/geo-optimizer/SKILL.md` | "Optimize [URL] for AI search" | ✅ |
| seo-command-center | `skills/seo-command-center/SKILL.md` | "SEO report for UTUBooking" | ✅ |

---

## Stage 4 — MCP Connections

| MCP | Server | Status | Action Required |
|---|---|---|---|
| GA4 | `analytics-mcp` (pipx) | ⚠️ Pending | Install pipx + create Google service account |
| GSC | `mcp-gsc` (Python venv) | ⚠️ Pending | Download `client_secrets.json` from Google Cloud |
| DataForSEO | `dataforseo-mcp-server` (npx) | ⚠️ Pending | Add login + password to `.env.mcp` |
| Notion | npx | ⚠️ Pending | Add `NOTION_API_KEY` to `.env.mcp` |
| Slack | npx | ⚠️ Pending | Add `SLACK_BOT_TOKEN` to `.env.mcp` |
| GDrive | npx | ⚠️ Pending | Add OAuth tokens to `.env.mcp` |
| GitHub | npx | ⚠️ Pending | Add `GITHUB_PERSONAL_ACCESS_TOKEN` to `.env.mcp` |

See `skills/seo-command-center/SETUP.md` for full installation SOP.

---

## Stage 5 — First Content Run

### 5A. Verify skills are loaded

```
What SEO skills do you have?
```
Expected: Lists seo-content-writer, seo-audit, keyword-research, geo-optimizer, seo-command-center

### 5B. Run the full 4-step pipeline

Paste into Claude Code (fill in your specifics):

```
Use the seo-content-writer skill to create a blog post.

Primary keyword: hotels near Masjid Al-Haram
Content angle: How to use walking time — not star rating — to choose the right hotel
Target audience: First-time Umrah traveler from the UK
Word count: 1,800 words
CTA goal: Search hotels on UTUBooking proximity filter
Negative keywords: tourist, seamless, hassle-free, world-class

Start with Step 1 (gather requirements and read tone-of-voice.md).
Present the outline and WAIT for my approval before writing.
```

### 5C. Outline approval gate — check all 4 before typing 'approved'

- [ ] Search intent analysis matches your target audience?
- [ ] ~60% of H2 sections marked as CAPSULE format?
- [ ] 3-5 genuine internal links identified (from sitemap.csv)?
- [ ] 8-15 credible sources listed for research step?

Type `approved` to proceed — or request specific changes first.

### 5D. Post delivery checklist — before publishing

- [ ] Markdown post clean and ready for CMS paste?
- [ ] FAQ Schema JSON-LD block included — paste into post `<head>`?
- [ ] All internal links resolve to real UTUBooking pages?
- [ ] Word count 1,600-2,000 words?
- [ ] UTM tags on all CTA links: `?utm_source=blog&utm_medium=organic&utm_campaign=[slug]`?
- [ ] Submit URL to Google Search Console after publishing?

---

## Stage 6 — Monthly Engine

| Asset | Location | Status |
|---|---|---|
| Monthly workflow | `skills/seo-copywriter/MONTHLY-ENGINE.md` | ✅ Built |
| 90-day calendar | `marketing/seo/content-calendar-90-days.md` | ✅ 12 briefs (Apr-Jun 2026) |
| Governance rules | `marketing/seo/governance/golden-rules.md` | ✅ 5 Golden Rules |
| ROI tracker | `marketing/seo/tracking/roi-tracker.md` | ✅ UTM builder + benchmarks |
| Scaling roadmap | `marketing/seo/scaling-roadmap.md` | ✅ 3-phase plan |

### Recurring cadence

| Cadence | Action | Skill |
|---|---|---|
| Weekly Mon | Pull GSC + GA4 performance report | seo-command-center |
| Weekly | Review opportunities (low CTR, positions 11-30) | seo-command-center |
| Monthly | AI Search Starter Kit audit on top 5 pages | seo-audit |
| Monthly | Generate 4-6 new content briefs from keyword gaps | keyword-research |
| Monthly | Write and publish 4-6 blog posts via full pipeline | seo-content-writer |
| Monthly | Answer Capsule rewrites on 2-3 existing posts | geo-optimizer |
| Quarterly | Refresh tone-of-voice.md + sitemap.csv | Manual |
| Quarterly | Full site GEO audit — report to stakeholders | seo-audit |

### Weekly Monday prompt (copy every week)

```
Use the seo-command-center skill to generate this week's SEO performance report
for UTUBooking.com. Pull GA4 + GSC data, flag any positions that dropped more
than 3 places, identify the top 3 opportunities for this week.
```

### Monthly audit prompt (copy first Monday of month)

```
Use the seo-audit skill to run a batch audit on the top 5 UTUBooking pages
by traffic this month. Score each against all 3 dimensions. Identify any
systemic issues appearing on 3+ pages. Output to
marketing/seo/reports/YYYY-MM-DD-monthly-audit.md
```

---

## Verification Prompts

**Check skills are loaded:**
```
What skills do you have available?
```
Expected: Lists seo-content-writer, seo-audit, keyword-research, geo-optimizer, seo-command-center

**Test content writer:**
```
Write a blog post about Umrah packing tips
```
Expected: Activates seo-content-writer, begins 4-step workflow at Step 1

**Test audit:**
```
Audit https://utubooking.com for SEO
```
Expected: Activates seo-audit, runs 3-dimension scoring

**Test keyword research:**
```
Keyword research for Umrah hotels
```
Expected: Activates keyword-research, produces tiered keyword table
