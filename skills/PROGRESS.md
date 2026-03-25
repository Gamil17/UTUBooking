# UTUBooking — Master Implementation Checklist
**Covers:** AI Ranking Course (7 Videos) + 10X Marketing with Claude Code (6 Stages)
**Last updated:** 2026-03-25
**Legend:** ✅ Complete | ⚠️ Manual step pending | ⏳ Not started

---

# MARKETING SKILLS SYSTEM (Ryan Doser — 10X Marketing)

## v1.0 Implementation Plan (6 Stages) — UTUBooking Adapted

### Stage 1: Environment

| # | Item | Status | Notes |
|---|---|---|---|
| 1.1 | VS Code + Claude Code extension | ✅ | Active |
| 1.2 | Claude Max subscription authenticated | ✅ | Active session |
| 1.3 | Folder structure (marketing/, skills/, blog-drafts/, social/, email/) | ✅ | All present |
| 1.4 | YouTube/ folder | ⏳ | Create when video content starts |
| 1.5 | GitHub repo initialized | ✅ | Branch: `master` |
| 1.6 | `.gitignore` — `.env`, `APIs.env`, credentials excluded | ✅ | Updated |
| 1.7 | `APIs.env` file created with `OPENROUTER_API_KEY` | ⚠️ | Copy `APIs.env.example` → `APIs.env`, add key from openrouter.ai |

### Stage 2: Core Files

| # | Item | Status | Notes |
|---|---|---|---|
| 2.1 | `CLAUDE.md` — business context, YouTube/blog, standing rules | ✅ | AI CMO Mode section complete |
| 2.2 | Style profile — 10 voice examples + banned phrases | ✅ | `skills/seo-content-writer/references/tone-of-voice.md` |
| 2.3 | `APIs.env` populated with OpenRouter key | ⚠️ | Get key at openrouter.ai/settings/keys |
| 2.4 | Test: ask "What do you know about my business?" — accurate? | ⏳ | Run in new Claude Code session |
| 2.5 | Test: ask "Write a LinkedIn post about the proximity filter" — sounds right? | ⏳ | |

### Stage 3: Deploy the 6 Real Skills

| # | Skill | File | Status |
|---|---|---|---|
| 3.1 | SEO Blog Post Writer | `skills/seo-content-writer/SKILL.md` | ✅ (UTUBooking: original content, not YouTube→WP) |
| 3.2 | Skill Creator | `skills/skill-creator/SKILL.md` | ✅ v1.2.0 spec |
| 3.3 | anti-slop | `skills/anti-slop.md` | ✅ 4-part system + slop word list |
| 3.4 | Auto-Improve | `skills/auto-improve.md` | ✅ passive, user-invocable: false |
| 3.5 | Crosscheck | `skills/crosscheck.md` | ✅ GPT+Gemini via OpenRouter |
| 3.6 | MCP Setup | `skills/mcp-setup.md` | ✅ CLI commands + troubleshooting |
| 3.7 | Verify: ask "What skills do you have?" | ⏳ | All 6+ should be listed with descriptions |

### Stage 4: CMS Publishing Setup (UTUBooking — Next.js, not WordPress)

> **UTUBooking adaptation:** Ryan Doser uses WordPress MCP. UTUBooking uses Next.js.
> The publishing workflow is: `marketing/blog-drafts/[slug].md` → editorial review → CMS upload.
> WordPress MCP steps do not apply.

| # | Item | Status | Notes |
|---|---|---|---|
| 4.1 | Blog draft output folder set up | ✅ | `marketing/blog-drafts/` ready |
| 4.2 | Blog draft naming convention established | ✅ | `YYYY-MM-DD-[keyword-slug]-EN.md` |
| 4.3 | `meta.json` template for each post | ⏳ | Create: `{title, meta_desc, word_count, primary_keyword, status}` |
| 4.4 | CMS upload workflow documented | ⏳ | Define: markdown → which CMS → who publishes |
| 4.5 | WordPress MCP (if separate WP blog exists) | ⏳ | Run `claude mcp add --transport http wordpress <url> --header "Authorization: Bearer <token>"` |

### Stage 5: MCP Connections

| # | MCP | Status | Action |
|---|---|---|---|
| 5.1 | OpenRouter — Crosscheck + image gen | ⚠️ | Add `OPENROUTER_API_KEY` to `APIs.env` |
| 5.2 | GA4 | ⚠️ | `pipx install analytics-mcp` + Google Cloud service account |
| 5.3 | GSC | ⚠️ | Drop `client_secrets.json` in `skills/seo-command-center/mcp-gsc/` |
| 5.4 | DataForSEO | ⚠️ | Add credentials to `.env.mcp` |
| 5.5 | Verify all: `claude mcp list` | ⏳ | Run after each MCP is configured |

Full SOP: `skills/seo-command-center/SETUP.md`

### Stage 6: First Blog Post (UTUBooking Adapted)

UTUBooking's posts are original pilgrimage content — not YouTube repurposing.
Use the 4-step pipeline below (no Blotato, no WordPress auto-publish).

**Pipeline prompt:**
```
Use the seo-content-writer skill to create a blog post.

Primary keyword: hotels near Masjid Al-Haram
Content angle: How to use walking time — not star rating — to choose the right hotel
Target audience: First-time Umrah traveler from the UK
Word count: 1,200 words (maximum — no fluff past 1,200)
CTA goal: Search hotels on UTUBooking proximity filter
Negative keywords: tourist, seamless, hassle-free, world-class, Wego, Almosafer

Start with Step 1. Present outline — WAIT for approval before writing.
After writing: run anti-slop.md. Save to marketing/blog-drafts/[slug]-EN.md
```

**Post-delivery checklist:**
- [ ] Intro is 1-2 sentences. Primary keyword in sentence 1, bolded once.
- [ ] ZERO em dashes, ZERO emojis, ZERO semicolons, ZERO slop words
- [ ] Word count does not exceed 1,200 words
- [ ] FAQ section present with 3+ questions
- [ ] 3-5 internal links from `sitemap.csv`
- [ ] FAQ Schema JSON-LD block delivered
- [ ] All external links verified working
- [ ] File saved to `marketing/blog-drafts/[YYYY-MM-DD]-[slug]-EN.md`
- [ ] `meta.json` saved alongside: title, meta desc (max 155 chars), word count

## Stage 2: Core Foundation

| # | Item | Status | Notes |
|---|---|---|---|
| 2.1 | CLAUDE.md with business context, audience, priorities, rules | ✅ | AI CMO Mode section added |
| 2.2 | Style profile with 10 voice examples + banned phrases | ✅ | `skills/seo-content-writer/references/tone-of-voice.md` |
| 2.3 | anti-slop.md deployed with Tier 1 + Tier 2 lists | ✅ | `skills/anti-slop.md` — UTUBooking bans added |
| 2.4 | CLAUDE.md tested — Claude describes business from memory | ⏳ | Test: ask "Who are you and what's your mission?" |
| 2.5 | Style profile tested — LinkedIn post sounds right | ⏳ | Test: "Write a LinkedIn post about the proximity filter" |

## Stage 3: First 3 Skills

| # | Item | Status | Notes |
|---|---|---|---|
| 3.1 | LinkedIn Post Writer deployed and tested | ✅ | `skills/marketing/linkedin-post-writer.md` |
| 3.2 | Email Newsletter Writer — Phase 1 pauses for approval | ✅ | `skills/marketing/email-newsletter-writer.md` |
| 3.3 | YouTube SEO Packaging — 3 title variants generated | ✅ | `skills/marketing/youtube-seo-packaging.md` |
| 3.4 | At least one skill patched after a mistake | ⏳ | Happens naturally in use — note when it occurs |

## Stage 4: Full Library

| # | Item | Status | Notes |
|---|---|---|---|
| 4.1 | skill-creator installed in Skills/ | ✅ | `skills/skill-creator/SKILL.md` (full Anthropic spec) |
| 4.2 | All 12 marketing skills deployed | ✅ | See Skills table below |
| 4.3 | 'List all skills' test passes | ⏳ | Verify: ask "What skills do you have?" |
| 4.4 | At least 1 new skill built from scratch via skill creator | ⏳ | Use: "Create a new skill for [task]" |

### All 12 Marketing Skills — Deployment Status

| # | Skill | File | Status |
|---|---|---|---|
| 1 | Style Profile | `seo-content-writer/references/tone-of-voice.md` | ✅ 10 golden sentences |
| 2 | Anti-Slop | `anti-slop.md` | ✅ Tier 1/2 + UTUBooking bans |
| 3 | LinkedIn Post Writer | `marketing/linkedin-post-writer.md` | ✅ |
| 4 | Email Newsletter Writer | `marketing/email-newsletter-writer.md` | ✅ 2-phase with approval gate |
| 5 | YouTube SEO Packaging | `marketing/youtube-seo-packaging.md` | ✅ UTUBooking video angles |
| 6 | SEO Blog Post | `seo-content-writer/SKILL.md` | ✅ 4-step + Answer Capsule |
| 7 | Content Repurpose | `marketing/content-repurpose.md` | ✅ LinkedIn+IG+WhatsApp+email |
| 8 | YouTube Thumbnail | — | ⏳ Not needed — skip until video production starts |
| 9 | Paid Ads | `marketing/paid-ads.md` | ✅ Google+Meta, 3 variants |
| 10 | Short-Form Video Script | `marketing/short-form-video-script.md` | ✅ Reels/TikTok/Shorts |
| 11 | Email CTAs | `marketing/email-ctas.md` | ✅ 3 variants + scoring |
| 12 | SEO Audit | `seo-audit/SKILL.md` | ✅ 42-point AI Search Starter Kit |
| + | Content Reviewer | `marketing/content-reviewer.md` | ✅ 15-point checklist |
| + | Skill Creator | `skill-creator/SKILL.md` | ✅ Anthropic best practices |

## Stage 5: AI CMO System

| # | Item | Status | Notes |
|---|---|---|---|
| 5.1 | CLAUDE.md updated with current campaigns and projects | ✅ | AI CMO Mode added; active campaigns listed |
| 5.2 | HANDOVER.md workflow established | ✅ | `marketing/HANDOVER.md` — paste start block each session |
| 5.3 | Sub-agent parallel workflow tested | ⏳ | Use Power Prompt 1 from `marketing/workflows/ai-cmo-power-prompt.md` |
| 5.4 | Voice dictation set up | ⏳ | Windows alternative to Super Whisper: Windows Speech Recognition or PowerToys |

## Stage 6: Data Connections

| # | Item | Status | Notes |
|---|---|---|---|
| 6.1 | GA4 MCP installed and tested | ⚠️ | `pipx install analytics-mcp` + Google Cloud service account |
| 6.2 | GSC MCP installed and tested | ⚠️ | Drop `client_secrets.json` in `mcp-gsc/` folder |
| 6.3 | DataForSEO MCP configured and tested | ⚠️ | Add login + password to `.env.mcp` |
| 6.4 | Full AI CMO prompt tested | ⏳ | Use Power Prompt 1 after MCPs are live |

---

---

## Stage 1: Environment

| # | Item | Status | Notes |
|---|---|---|---|
| 1.1 | VS Code installed and Claude Code extension active | ✅ | Active — you're using it now |
| 1.2 | Claude Max or Team subscription authenticated | ✅ | Active session |
| 1.3 | Project folder structure created | ✅ | `skills/` + all 5 skill folders |
| 1.4 | GitHub repo initialized and first commit made | ✅ | Branch: `master`, remote: origin |
| 1.5 | `.gitignore` created — `.env` files excluded | ✅ | `.env`, `.env.mcp`, secrets excluded |

---

## Stage 2: Reference Files

| # | Item | Status | Notes |
|---|---|---|---|
| 2.1 | `tone-of-voice.md` written with specific examples and vocabulary lists | ✅ | 10 golden sentences + opinion starters (`Look,` / `Here's the reality:`) + negative list |
| 2.2 | `sitemap.csv` exported — URL, Title, MetaDescription | ✅ | 24 pages, full `https://utubooking.com/...` URLs |
| 2.3 | `experiences.md` populated with 5+ case studies | ✅ | 5 stories: Context / Strategy / Result / Timeframe format |
| 2.4 | All three files in `skills/seo-content-writer/references/` | ✅ | All present and committed |

---

## Stage 3: Skills Deployed

| # | Item | Status | File |
|---|---|---|---|
| 3.1 | Skill 1: seo-content-writer SKILL.md | ✅ | `skills/seo-content-writer/SKILL.md` |
| 3.2 | Skill 2: seo-audit SKILL.md | ✅ | `skills/seo-audit/SKILL.md` |
| 3.3 | Skill 3: keyword-research SKILL.md | ✅ | `skills/keyword-research/SKILL.md` |
| 3.4 | Skill 4: geo-optimizer SKILL.md | ✅ | `skills/geo-optimizer/SKILL.md` |
| 3.5 | Skill 5: seo-command-center SKILL.md | ✅ | `skills/seo-command-center/SKILL.md` |
| 3.6 | All skills respond correctly when triggered | ✅ | Verify with prompt below |

**Verification prompt:**
```
What SEO skills do you have?
```
Expected: Lists all 5 skills with their trigger phrases.

---

## Stage 4: Command Center Connected

| # | Item | Status | Action Required |
|---|---|---|---|
| 4.1 | GA4 MCP installed and tested | ⚠️ | `pipx install analytics-mcp` → create Google Cloud service account → grant GA4 Viewer access → add `GA4_PROPERTY_ID` to `.env.mcp` |
| 4.2 | GSC MCP installed and tested | ⚠️ | Download `client_secrets.json` from Google Cloud → save to `skills/seo-command-center/mcp-gsc/client_secrets.json` → first run opens browser for OAuth |
| 4.3 | DataForSEO MCP configured and tested | ⚠️ | Add `DATAFORSEO_LOGIN` + `DATAFORSEO_PASSWORD` to `.env.mcp` |
| 4.4 | `.mcp.json` and `settings.local.json` committed | ✅ | Both committed; `.mcp.json` uses env var placeholders (safe to commit) |

Full setup SOP: `skills/seo-command-center/SETUP.md`

**Test prompts (run after each MCP is configured):**
```
# GA4
Using the analytics MCP, show me the top 5 pages by sessions for utubooking.com last 30 days.

# GSC
Using the GSC MCP, list all my Search Console properties.

# DataForSEO
Using the DataForSEO MCP, get keyword volume for "hotels near masjid al haram" in Saudi Arabia.
```

---

## Stage 5: First Content Run

| # | Item | Status | Notes |
|---|---|---|---|
| 5.1 | First blog post brief submitted using seo-content-writer skill | ⏳ | Use prompt below |
| 5.2 | Outline reviewed and approved before writing proceeded | ⏳ | Check 4 items before typing `approved` |
| 5.3 | Full post received with FAQ Schema JSON-LD block | ⏳ | |
| 5.4 | Quality checklist verified — all items passed | ⏳ | |
| 5.5 | Post published in CMS with schema in `<head>` section | ⏳ | |

### 5A. Pipeline prompt (paste into Claude Code)

```
Use the seo-content-writer skill to create a blog post.

Primary keyword: hotels near Masjid Al-Haram
Content angle: How to use walking time — not star rating — to choose the right hotel
Target audience: First-time Umrah traveler from the UK
Word count: 1,800 words
CTA goal: Search hotels on UTUBooking proximity filter
Negative keywords: tourist, seamless, hassle-free, world-class, Wego, Almosafer

Start with Step 1 (gather requirements and read tone-of-voice.md).
Present the outline and WAIT for my approval before writing.
```

### 5B. Outline approval gate — check all 4 before typing `approved`

- [ ] Search intent analysis correct for your audience?
- [ ] ~60% of H2 sections marked as CAPSULE format?
- [ ] 3-5 genuine internal links identified (from sitemap.csv)?
- [ ] 8-15 credible sources listed?

### 5C. Publish checklist — before CMS upload

- [ ] Markdown clean and ready to paste?
- [ ] FAQ Schema JSON-LD block present — paste into `<head>`?
- [ ] All internal links resolve to real UTUBooking pages?
- [ ] Word count 1,600-2,000 words?
- [ ] UTM tags on all CTA links: `?utm_source=blog&utm_medium=organic&utm_campaign=[slug]`?
- [ ] Submitted to Google Search Console after publishing?

---

## Stage 6: Recurring Engine

| # | Item | Status | Notes |
|---|---|---|---|
| 6.1 | Weekly GSC + GA4 report workflow configured | ✅ | Weekly Monday prompt in `MONTHLY-ENGINE.md` |
| 6.2 | Monthly content calendar populated | ✅ | 90-day calendar Apr-Jun 2026 + keyword-research skill |
| 6.3 | Quarterly skill maintenance reminders set | ✅ | Dates: 1 Jul / 1 Oct 2026, 1 Jan 2027 — in `MONTHLY-ENGINE.md` |

### Weekly Monday prompt (copy each Monday)

```
Use the seo-command-center skill to generate this week's SEO performance report
for UTUBooking.com. Pull GA4 + GSC data, flag any positions that dropped more
than 3 places, identify the top 3 opportunities for this week.
```

### Monthly audit prompt (first Monday of month)

```
Use the seo-audit skill to run a batch audit on the top 5 UTUBooking pages
by traffic this month. Identify systemic issues on 3+ pages. Save to
marketing/seo/reports/YYYY-MM-DD-monthly-audit.md
```

### Quarterly skill refresh (15 min — dates above)

```
1. Update skills/seo-content-writer/references/sitemap.csv — add new pages
2. Update skills/seo-content-writer/references/experiences.md — add new wins
3. If voice changed: update tone-of-voice.md + re-run GENERATOR-PROMPT.md
```

---

## Overall Status

| Stage | Complete | Pending |
|---|---|---|
| 1 Environment | 5/5 | 0 |
| 2 Reference Files | 4/4 | 0 |
| 3 Skills Deployed | 6/6 | 0 |
| 4 Command Center | 1/4 | 3 manual steps |
| 5 First Content | 0/5 | Run Stage 5A prompt |
| 6 Recurring Engine | 3/3 | 0 |
| **Total** | **19/27** | **8 items remaining** |

**Remaining blockers (in order):**
1. Add `client_secrets.json` to mcp-gsc folder (GSC OAuth)
2. Run `pipx install analytics-mcp` + Google Cloud service account (GA4)
3. Add DataForSEO credentials to `.env.mcp`
4. Run the Stage 5A prompt for your first blog post
5. Publish the post and complete the 5C checklist
