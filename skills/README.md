# UTUBooking Skills Index
**Version:** 1.3.0 "Content Engine"
**Last updated:** 2026-03-25

All Claude skills for UTUBooking.com. Each skill is a persistent instruction file
Claude reads automatically when invoked. Skills beat prompts — write once, use forever.

---

## SEO Skills Suite (AI Ranking Course — 7 Videos)

| Skill | Folder | Video | Status | Trigger |
|---|---|---|---|---|
| SEO Content Writer | `seo-content-writer/` | #16 | Scaffold (Part 2 pending) | "Write SEO post about [topic]" |
| Skill Creator & Voice Setup | `skill-creator/` | #17 | Scaffold (Part 2 pending) | "Create SEO skill for [brand]" |
| GEO / AI Search Optimization | `geo-ai-search/` | #18 | Scaffold (Part 2 pending) | "Optimize [URL] for AI search" |
| SEO Command Center | `seo-command-center/` | #20 | Scaffold (Part 2 pending) | "SEO report for UTUBooking" |
| Keyword Research | `keyword-research/` | #21+22 | Scaffold (Part 2 pending) | "Keyword research for [topic]" |

**Data sources wired (MCPs):** GA4 · Google Search Console · DataForSEO · Notion · Slack · Google Drive · GitHub

---

## Existing UTUBooking Copywriter Skill (v1.3.0 — Fully Built)

| Skill | Folder | Status | Trigger |
|---|---|---|---|
| SEO Copywriter | `seo-copywriter/` | **Complete** | "SEO: [topic]" or "Write SEO blog post about [topic]" |

Key files:
- `seo-copywriter/SKILL.md` — 4-step workflow, Answer Capsule, bilingual rules
- `seo-copywriter/SEO-QUICK-START.md` — 5 ready briefs + checklists
- `seo-copywriter/MONTHLY-ENGINE.md` — week-by-week content engine
- `seo-copywriter/keywords/target-keywords.md` — Tier 1/2/3 master list

---

## Business Operations Skills (Pre-existing)

| Skill | File | Purpose |
|---|---|---|
| Proposal Generator | `proposal-generator.md` | Generate client proposals |
| Weekly Report | `weekly-report.md` | Weekly ops summary |
| Social Post Kit | `social-post-kit.md` | LinkedIn / Instagram / WhatsApp posts |

### Agent Skills

| Agent | File | Role |
|---|---|---|
| Orchestrator | `agents/orchestrator.md` | Coordinates all agents |
| Dev | `agents/dev-agent.md` | Engineering tasks |
| Marketing | `agents/marketing-agent.md` | Content + campaigns |
| Sales | `agents/sales-agent.md` | Proposals + CRM |
| HR | `agents/hr-agent.md` | Hiring + onboarding |
| Finance | `agents/finance-agent.md` | Reporting + budgets |
| Product | `agents/product-agent.md` | Roadmap + features |
| CS | `agents/cs-agent.md` | Customer support |
| Legal | `agents/legal-agent.md` | Compliance + contracts |

---

## MCP Connections

| MCP | Server | Purpose | Status |
|---|---|---|---|
| Notion | `@notionhq/notion-mcp-server` | Content calendar, keyword DB | Config ready |
| Slack | `@modelcontextprotocol/server-slack` | Draft-ready alerts to #marketing | Config ready |
| Google Drive | `@modelcontextprotocol/server-gdrive` | Draft file storage | Config ready |
| GitHub | `@modelcontextprotocol/server-github` | Content version control | Config ready |
| GA4 | `@pepeaburtov/mcp-google-analytics` | Traffic + conversion data | Config ready |
| GSC | `@modelcontextprotocol/server-google-search-console` | Rankings + impressions | Config ready |
| DataForSEO | `@dataforseo/mcp-server` | Keyword research + SERP data | Config ready |

**Setup:** Copy `.env.mcp.example` → `.env.mcp`, fill all tokens. See `skills/seo-command-center/SKILL.md` for verification steps.

---

## Version History

| Tag | Name | What was added |
|---|---|---|
| v1.0.0 | Gulf Launch | Core platform |
| v1.1.0 | Muslim World | Phase 5-7 markets |
| v1.2.0 | Global Ummah | Phase 8-12 + compliance |
| v1.3.0 | Content Engine | SEO Copywriter Skill (complete) + 90-day calendar |
| v1.4.0 (next) | SEO Command Center | All 5 AI Ranking skills + GA4/GSC/DataForSEO live |
