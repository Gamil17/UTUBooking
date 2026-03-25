# UTUBooking Sub-Agents Guide
**Source:** Ryan Doser AI CMO Method, Part 5
**Purpose:** How to use Claude Code sub-agents for parallel content production

---

## The Core Concept

| Mode | Time to produce 3 blog posts |
|---|---|
| Sequential (one at a time) | 45 min × 3 = 2.25 hours |
| Parallel (3 sub-agents) | 45 min × 1 = 45 minutes |

Sub-agents are separate Claude Code sessions launched by the main agent.
Each runs independently with its own context window.
All save output to `marketing/blog-drafts/` for main agent review.

**Total session time = the time for the longest single task, not the sum.**

---

## When to Use Sub-Agents

| Use case | Sub-agents |
|---|---|
| 3+ blog posts in one session | Yes — one agent per post |
| Full campaign (blog + social + email + ads) | Yes — one agent per channel |
| Monthly content calendar (6 posts) | Yes — 2-3 agents per batch |
| Single blog post | No — main agent handles it |
| SEO audit of one page | No — main agent handles it |

---

## How to Launch Sub-Agents

In Claude Code, prefix the instruction with `Agent:` or use the task tool:

```
Agent task 1: Write post on "hotels near Masjid Al-Haram" → save to marketing/blog-drafts/
Agent task 2: Write post on "Umrah packing checklist" → save to marketing/blog-drafts/
Agent task 3: Write post on "Ramadan Umrah booking guide" → save to marketing/blog-drafts/
```

All 3 run simultaneously. Main agent waits for all 3 to complete, then reviews.

---

## Sub-Agent Context Rules

**Load only what each agent needs.** This is the most important rule.

| Agent type | Load these files | Do NOT load |
|---|---|---|
| Blog writer | seo-content-writer/SKILL.md + tone-of-voice.md + sitemap.csv | seo-audit, keyword-research, other skills |
| Social writer | marketing/linkedin-post-writer.md + tone-of-voice.md | Full seo-content-writer, sitemap |
| Ads writer | marketing/paid-ads.md + tone-of-voice.md | Blog skills, sitemap |
| Repurpose agent | marketing/content-repurpose.md + the source post | Other skills |

Every file you load into a sub-agent uses tokens from its context window.
Irrelevant files = degraded output + wasted tokens.

---

## Sub-Agent Output Protocol

Every sub-agent must:
1. Save output to the correct `marketing/` subfolder (never desktop, never root)
2. Run `skills/anti-slop.md` before saving
3. Name files: `[YYYY-MM-DD]-[keyword-slug]-EN.md` or `-AR.md`
4. Never publish or send — all output is draft for main agent review

File naming examples:
```
marketing/blog-drafts/2026-04-15-hotels-near-masjid-al-haram-EN.md
marketing/social/2026-04-15-ramadan-campaign-social-pack.md
marketing/email/2026-04-15-ramadan-newsletter-KSA.md
```

---

## Main Agent Review Checklist

After sub-agents complete, main agent checks each output:

```
Use the content-reviewer skill to review the 3 posts saved to marketing/blog-drafts/.
For each post:
  - Run the 15-point quality checklist
  - Note any failed checks with fix instructions
  - Output: PUBLISH READY / MINOR FIXES / NEEDS REVISION

After review, produce a summary table:
| Post | Score | Verdict | Top Fix |
| ...  | ...   | ...     | ...     |
```

---

## Parallel Production Example — Ramadan Campaign

```
Main agent session — single prompt:

"We need a full Ramadan 2026 campaign for the UK market.

Spin up 4 sub-agents in parallel:

Agent 1 — Blog post:
  Load: skills/seo-content-writer/SKILL.md + references
  Brief: 'Ramadan Umrah from the UK — booking guide 2026', 1,800 words
  Save: marketing/blog-drafts/2026-ramadan-umrah-uk-EN.md

Agent 2 — Social pack:
  Load: skills/marketing/content-repurpose.md
  Source: Agent 1 output (wait for blog draft first)
  Output: LinkedIn + Instagram + WhatsApp (AR)
  Save: marketing/social/2026-ramadan-uk-social-pack.md

Agent 3 — Email newsletter:
  Load: skills/marketing/email-newsletter-writer.md
  Brief: Ramadan campaign email for UK subscribers, GBP pricing
  Phase 1 only — present 5 story angles before writing
  Save angles to: marketing/email/2026-ramadan-uk-newsletter-angles.md

Agent 4 — Paid ads:
  Load: skills/marketing/paid-ads.md
  Brief: Google Search + Meta ads for Ramadan Umrah UK
  3 variants each
  Save: marketing/seo/2026-ramadan-uk-ads.md

Agents 1, 3, 4 can run in parallel.
Agent 2 runs after Agent 1 completes (needs the blog post as source).

After all complete: run content-reviewer on all outputs."
```

---

## What Sub-Agents Cannot Do

- Sub-agents cannot directly communicate with each other
- Sub-agents cannot use MCP tools unless explicitly told to and granted access
- Sub-agents cannot make git commits (main agent handles version control)
- Sub-agents should not ask clarifying questions — brief them fully upfront
