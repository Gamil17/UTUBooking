---
name: seo-command-center
description: |
  Activates when asked to pull SEO data, check rankings, analyze traffic,
  review Search Console performance, run keyword research via DataForSEO,
  or generate SEO reports. Requires GA4, GSC, and DataForSEO MCPs.
---

# SEO Command Center Skill

## AVAILABLE DATA SOURCES
- ga4_mcp: Google Analytics 4 — traffic, sessions, conversions by page/channel
- gsc_mcp: Google Search Console — queries, impressions, CTR, position
- dataforseo_mcp: Keyword research, SERP data, AI Overview citations

## STANDARD QUERIES

### Weekly Performance Report
When asked for a weekly report:
1. GA4: Get top 10 pages by sessions (last 7 days vs prior 7 days)
2. GA4: Organic channel traffic trend (last 7 days)
3. GSC: Top 20 queries by impressions (last 7 days)
4. GSC: Pages with impressions > 1000 but CTR < 2% (CTR opportunity list)
5. GSC: New queries this week not in top 100 last week
Present as: Executive Summary + Data Tables + Priority Actions

### Keyword Position Check
When asked to check ranking for a keyword:
1. GSC: Current position, impressions, CTR for that query
2. DataForSEO: Live SERP position + AI Overview presence
3. Compare: GSC rank vs DataForSEO rank (gaps indicate tracking issues)

### Content Gap Analysis
When asked to find content gaps:
1. DataForSEO: Keywords where competitors rank top 10 but client does not
2. GSC: Queries with avg position 11-30 (low-hanging fruit for improvement)
3. Present: Priority matrix — Impact x Effort for each gap

### AI Citation Check
When asked about AI search visibility:
1. DataForSEO: AI Overview API — check if client appears in Google SGE
2. Report: which pages are cited, which queries trigger AI Overviews
3. Flag: pages with high GSC impressions but NO AI Overview presence
   (these need Answer Capsule treatment from the geo-optimizer skill)

## REPORT FORMAT
Always end reports with:
TOP 3 ACTIONS THIS WEEK: [specific, ranked by impact]
WINS TO HIGHLIGHT: [what improved]
RISK FLAGS: [drops, indexing issues, competitor movements]
