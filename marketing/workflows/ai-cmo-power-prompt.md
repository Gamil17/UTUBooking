# UTUBooking AI CMO — Power Prompt Templates
**Source:** Ryan Doser AI CMO Method, Part 5
**Purpose:** One-prompt sessions that trigger the full content pipeline
**How to use:** Copy a prompt block, fill in your specifics, paste into Claude Code

---

## POWER PROMPT 1 — Full Content Pipeline (3 Blog Posts in Parallel)

Adapted from Adam Sandler's example in Ryan's AI CMO video.

```
Read my Google Search Console and GA4 data from the last 30 days.

Based on what's performing and trending, recommend 10 blog post topics for UTUBooking.com.
For each topic: keyword, estimated search intent, suggested H1, and 3-sentence outline.
Save the recommendations as marketing/seo/topic-ideas-[YYYY-MM].csv

Then pick the top 3 topics by: highest traffic potential + lowest content coverage on our site.
Write full outlines for each using the seo-content-writer skill.
Present all 3 outlines for my approval before writing.

After I approve, spin up a sub-agent for each post and write all 3 in parallel.
Each sub-agent should:
  - Load skills/seo-content-writer/SKILL.md
  - Load skills/seo-content-writer/references/tone-of-voice.md
  - Load skills/seo-content-writer/references/sitemap.csv for internal links
  - Write the full post (1,800 words) + FAQ Schema JSON-LD block
  - Save to marketing/blog-drafts/[keyword-slug]-EN.md

Run skills/anti-slop.md on all 3 posts before saving.
```

---

## POWER PROMPT 2 — Weekly Monday SEO Report

Run every Monday morning. Takes ~5 minutes with MCPs connected.

```
Use the seo-command-center skill to generate this week's UTUBooking SEO report.

Pull data from:
  - GA4: top 10 pages by sessions, traffic sources, week-on-week change
  - GSC: top 20 queries by impressions, position changes vs last week
  - Flag: any keyword that dropped more than 3 positions
  - Flag: any page with impressions >200 and CTR <2% (title/meta opportunity)

Identify the top 3 opportunities for this week:
  1. Best page to optimize for CTR (title/meta rewrite)
  2. Best keyword opportunity (positions 11-20 with high impressions)
  3. Best content gap (high-volume query with no UTUBooking page ranking)

Save full report to marketing/seo/reports/[YYYY-MM-DD]-weekly-seo-report.md
Post a summary to Slack #marketing if Slack MCP is connected.
```

---

## POWER PROMPT 3 — Monthly Content Calendar Build

Run on the first Monday of each month.

```
Use the keyword-research skill to build next month's content calendar for UTUBooking.

Step 1 — Research:
  - Pull GSC data for queries with positions 11-30 and impressions >100
  - Search DataForSEO for keyword volume on our Tier 2 keyword list
    (skills/seo-copywriter/keywords/target-keywords.md)
  - Find 3 competitor blog posts from Almosafer or Wego published this month
    that we don't have equivalent content for

Step 2 — Build calendar:
  - Select 6 topics: 1 Tier 1 + 3 Tier 2 + 1 seasonal + 1 market-specific
  - For each: keyword, H1, brief (3 sentences), target CTA page, market, language
  - Save to marketing/seo/content-calendar-[YYYY-MM].md

Step 3 — Populate Notion (if Notion MCP connected):
  - Create 6 entries in the UTUBooking SEO Content Calendar database
  - Status = Briefing, Assigned = Claude SEO Skill
```

---

## POWER PROMPT 4 — Multi-Channel Campaign Launch

Use when launching a seasonal campaign (Ramadan, Hajj season, Eid).

```
We are launching a [Ramadan / Hajj / Eid] campaign for [market: KSA / UK / US / MY].

Using these skills in sequence:

1. keyword-research skill:
   Find 5 seasonal keywords for [market] + [season]. Include Arabic and English variants.

2. seo-content-writer skill:
   Write 1 long-form blog post targeting the top keyword.
   4-step workflow — outline approval required before writing.
   Save to marketing/blog-drafts/[season]-[market]-[keyword].md

3. content-repurpose skill:
   Repurpose the approved blog post into:
   - LinkedIn post (EN)
   - Instagram caption (EN + AR)
   - WhatsApp broadcast (AR — Gulf dialect)
   Save all to marketing/social/[season]-[market]-social-pack.md

4. email-newsletter-writer skill:
   Phase 1: present 5 story angles based on the campaign theme — wait for approval
   Phase 2: write full newsletter with seasonal CTA
   Save to marketing/email/[season]-[market]-newsletter.md

5. paid-ads skill:
   Write 3 Google Search ad variants + 3 Meta ad variants for the campaign.
   Save to marketing/seo/[season]-[market]-ads.md

Run anti-slop.md on all outputs before saving.
```

---

## POWER PROMPT 5 — Content Audit + Refresh Sprint

Run quarterly. Identifies underperforming content and upgrades it.

```
Use the seo-audit skill and seo-command-center skill together for a content refresh sprint.

Step 1 — Identify candidates (seo-command-center):
  From GSC + GA4, find the 5 UTUBooking blog posts that have:
  - Highest impressions but lowest CTR (title/meta issue)
  - OR highest positions 11-30 (one step from page 1)
  - OR published >90 days ago with no traffic

Step 2 — Audit each (seo-audit):
  Run the AI Search Starter Kit audit on each of the 5 URLs.
  Score across 3 dimensions. Note the #1 fix per page.
  Save batch scorecard to marketing/seo/reports/[YYYY-MM-DD]-refresh-audit.md

Step 3 — Refresh top 2 (geo-optimizer):
  For the 2 lowest-scoring, highest-traffic pages:
  - Apply Answer Capsule rewrites to the top 3 H2 sections
  - Add or improve FAQPage schema
  - Update the publish date
  Save refreshed versions to marketing/blog-drafts/[slug]-refreshed.md
```

---

## Sub-Agent Instructions Template

When spinning up sub-agents for parallel production, use this tight instruction format:

```
Sub-agent task: Write blog post on [keyword]
Load only these files:
  - skills/seo-content-writer/SKILL.md
  - skills/seo-content-writer/references/tone-of-voice.md
  - skills/seo-content-writer/references/sitemap.csv (for internal links only)

Brief:
  - Primary keyword: [keyword]
  - Content angle: [angle]
  - Target audience: [audience]
  - Word count: 1,800
  - CTA goal: [CTA]
  - Negative keywords: tourist, seamless, hassle-free, [competitors]

Workflow: skip Step 1 gathering (brief is above). Go straight to Step 2 research.
Present outline to main agent for review. Do NOT write without approval.
After approval: write full post + FAQ Schema JSON-LD.
Run skills/anti-slop.md before saving.
Save to: marketing/blog-drafts/[keyword-slug]-EN.md
```

**Key rule:** Keep sub-agent context window clean. Load only the files each agent needs.
Irrelevant context = degraded output quality + wasted tokens.
