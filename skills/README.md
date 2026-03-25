# UTUBooking Skills Index
**Version:** 1.5.0 "Marketing Skills Suite" (pending tag)
**Last updated:** 2026-03-25

All Claude skills for UTUBooking.com. Each skill is a persistent instruction file
Claude reads automatically when invoked. Skills beat prompts — write once, use forever.

---

## SEO Skills Suite (AI Ranking Course — 7 Videos) — ALL COMPLETE

| Skill | Folder | Video | Trigger |
|---|---|---|---|
| SEO Content Writer | `seo-content-writer/` | #16 | "Write SEO post about [topic]" |
| SEO Audit | `seo-audit/` | #19 | "Audit [URL] for SEO" |
| Keyword Research | `keyword-research/` | #21+22 | "Keyword research for [topic]" |
| GEO Optimizer | `geo-optimizer/` | #18 | "Optimize [URL] for AI search" |
| SEO Command Center | `seo-command-center/` | #20 | "SEO report for UTUBooking" |

### Skill 1 — seo-content-writer (Video #16)
4-step approval workflow: gather requirements → research → outline approval → write
Reference files (required):
- `seo-content-writer/references/tone-of-voice.md` — brand voice rules
- `seo-content-writer/references/sitemap.csv` — internal link pool (25 pages)
- `seo-content-writer/references/experiences.md` — customer stories + social proof

### Skill 2 — seo-audit (Video #19)
3-dimension AI Search Starter Kit scoring: General/Site-Wide (12pts) + Blog (15pts) + Page (15pts)
Overall GEO Score out of 42. Outputs grade table + Top 3 priority fixes.

### Skill 3 — keyword-research (Video #21+22)
Seed expansion → DataForSEO API (or web fallback) → prioritized table → pillar + cluster map
DataForSEO MCP required for live volume data; web search fallback always available.

### Skill 4 — geo-optimizer (Video #18)
Answer Capsule technique, GEO checklist (content + schema + authority signals), FAQ schema generator.
Optimizes for ChatGPT, Perplexity, Google AI Overviews, Copilot citations.

### Skill 5 — seo-command-center (Video #20)
Weekly performance report, keyword position check, content gap analysis, AI citation check.
Requires GA4 + GSC + DataForSEO MCPs. See `.env.mcp.example` for setup.

---

## UTUBooking Copywriter Skill (v1.3.0 — Fully Built)

| Skill | Folder | Trigger |
|---|---|---|
| SEO Copywriter | `seo-copywriter/` | "SEO: [topic]" |

Key files:
- `seo-copywriter/SKILL.md` — bilingual EN+AR, Haram proximity angle, Gulf market focus
- `seo-copywriter/SEO-QUICK-START.md` — 5 ready briefs + approval checklists
- `seo-copywriter/MONTHLY-ENGINE.md` — week-by-week content engine
- `seo-copywriter/keywords/target-keywords.md` — Tier 1/2/3 master list
- `marketing/seo/content-calendar-90-days.md` — 12 ready briefs (Apr-Jun 2026)

---

## Marketing Skills Suite (Ryan Doser Method — Part 4)

### Foundation Skills (run these on every output)

| Skill | File | Trigger |
|---|---|---|
| Anti-Slop Filter | `anti-slop.md` | "Run anti-slop on this content" |
| Skill Creator | `skill-creator/SKILL.md` | "Create a new skill for [task]" |
| Content Reviewer | `marketing/content-reviewer.md` | "Review this content before publishing" |

### Content Creation Skills

| Skill | File | Trigger |
|---|---|---|
| Social Post Kit | `social-post-kit.md` | "Create social posts for [topic]" |
| LinkedIn Post Writer | `marketing/linkedin-post-writer.md` | "Write a LinkedIn post about [topic]" |
| Email Newsletter Writer | `marketing/email-newsletter-writer.md` | "Write a newsletter about [topic]" |
| Email CTAs | `marketing/email-ctas.md` | "Write email CTA for [campaign]" |
| Content Repurpose | `marketing/content-repurpose.md` | "Repurpose this post for social/email" |
| Short-Form Video Script | `marketing/short-form-video-script.md` | "Write a Reel/TikTok script about [topic]" |
| Paid Ads | `marketing/paid-ads.md` | "Write Google/Meta ads for [campaign]" |

### Business Operations Skills

| Skill | File | Purpose |
|---|---|---|
| Proposal Generator | `proposal-generator.md` | Generate client proposals |
| Weekly Report | `weekly-report.md` | Weekly ops summary |

### Agent Skills (9 agents)
`agents/`: orchestrator, dev, marketing, sales, hr, finance, product, cs, legal

---

## MCP Connections (7 servers configured)

| MCP | Server | Purpose | Activate in |
|---|---|---|---|
| Notion | `@notionhq/notion-mcp-server` | Content calendar | `seo-copywriter` |
| Slack | `@modelcontextprotocol/server-slack` | Draft-ready alerts | `seo-copywriter` |
| Google Drive | `@modelcontextprotocol/server-gdrive` | File storage | all skills |
| GitHub | `@modelcontextprotocol/server-github` | Version control | all skills |
| GA4 | `@pepeaburtov/mcp-google-analytics` | Traffic data | `seo-command-center` |
| GSC | `@modelcontextprotocol/server-google-search-console` | Rankings | `seo-command-center` |
| DataForSEO | `@dataforseo/mcp-server` | Keyword + SERP data | `keyword-research`, `seo-command-center` |

**Setup:** Copy `.env.mcp.example` → `.env.mcp`, fill all tokens, restart Claude Code.

---

## Version History

| Tag | Name | What was added |
|---|---|---|
| v1.0.0 | Gulf Launch | Core platform |
| v1.1.0 | Muslim World | Phase 5-7 markets |
| v1.2.0 | Global Ummah | Phase 8-12 + compliance |
| v1.3.0 | Content Engine | SEO Copywriter Skill + 90-day calendar |
| v1.4.0 | SEO Command Center | All 5 AI Ranking skills + GA4/GSC/DataForSEO |
| v1.5.0 | Marketing Skills Suite | 9 marketing skills: anti-slop, skill-creator, LinkedIn, email, ads, video, repurpose, CTA, reviewer |
