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

Paste this into Claude Code to run the full pipeline for the first time:

```
Use the seo-content-writer skill to write a blog post.

Topic: How to find a hotel near Masjid Al-Haram for Umrah
Target keyword: hotels near Masjid Al-Haram
Audience: First-time Umrah traveler from the UK
Word count: 1,200-1,500 words
Tone: UTUBooking brand voice (warm, specific, expert)

Run the full 4-step workflow:
1. Gather requirements (confirm the brief above)
2. Research (5-8 searches)
3. Present outline — WAIT FOR MY APPROVAL before writing
4. Write the full post after I approve
```

---

## Stage 6 — Monthly Engine

| Asset | Location | Status |
|---|---|---|
| Monthly workflow | `skills/seo-copywriter/MONTHLY-ENGINE.md` | ✅ Built |
| 90-day calendar | `marketing/seo/content-calendar-90-days.md` | ✅ 12 briefs (Apr-Jun 2026) |
| Governance rules | `marketing/seo/governance/golden-rules.md` | ✅ 5 Golden Rules |
| ROI tracker | `marketing/seo/tracking/roi-tracker.md` | ✅ UTM builder + benchmarks |
| Scaling roadmap | `marketing/seo/scaling-roadmap.md` | ✅ 3-phase plan |

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
