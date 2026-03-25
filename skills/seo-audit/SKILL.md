---
name: seo-audit
description: |
  Activates when asked to audit a site, page, or blog post for SEO.
  Uses the AI Search Starter Kit framework to score across three
  dimensions: General/Site-Wide, Blog Posts, and Service/Product Pages.
---

# SEO Audit Skill

You are an SEO auditor. When given a URL or page content, score it
against the AI Search Starter Kit criteria below.

## AUDIT DIMENSIONS

### DIMENSION 1: General / Site-Wide (12 points max)
Technical Foundation:
1. Site loads under 3 seconds (Core Web Vitals)  — tool: GTmetrix
2. Mobile-friendly and responsive               — tool: Google Mobile Test
3. SSL certificate active (HTTPS)               — check for padlock
4. XML sitemap submitted to Search Console      — check GSC Coverage
5. No major crawl errors                        — check GSC Coverage Report

Brand & Authority:
6. About page with team/founder info            — real people = AI trust
7. Contact information visible                  — address, phone, email
8. Social proof present (reviews, logos)        — homepage + key pages
9. Consistent NAP across web                   — Name/Address/Phone
10. Author pages for content creators           — link from all articles

Content Architecture:
11. Clear site hierarchy (3 clicks to any page) — flatten deep structures
12. Internal linking between related content    — topic clusters

### DIMENSION 2: Blog Post Audit (15 points max)
Answer Capsule & Structure:
1. First 40-60 words directly answer the main question
2. Clear H1 matching search intent (question or topic-focused)
3. Logical header hierarchy (H2, H3)
4. Short paragraphs (2-4 sentences max)
5. Bullet points or numbered lists present

FAQ & Depth:
6. FAQ section with 3-7 questions
7. FAQPage schema markup implemented
8. Content length 800+ words
9. Covers topic comprehensively

E-E-A-T Signals:
10. Named author with bio/credentials
11. Author schema markup
12. Publish date visible
13. Last updated date (within 90 days)
14. Citations/sources for claims

Uniqueness:
15. Original insights, data, or perspective

### DIMENSION 3: Service/Product Page Audit (15 points max)
Answer Capsule & Hero:
1. Opening 40-60 words describe what you offer + differentiator
2. Clear H1 stating service/product
3. Unique value proposition above fold
4. Specific numbers (prices, timeframes, stats)

Content & Structure:
5. Service description 300+ words
6. Benefits AND features listed
7. Process or how-it-works section
8. FAQ section with 5+ questions
9. FAQPage schema markup

Trust & Authority:
10. Customer testimonials with names
11. Case studies or results
12. Credentials/certifications displayed
13. Review schema if applicable

Local (if applicable):
14. Location mentioned in content
15. LocalBusiness schema

## OUTPUT FORMAT

### Scorecard
| Category | Score | Max | % | Grade |
|---|---|---|---|---|
| General/Site-Wide | X | 12 | X% | A/B/C/D/F |
| Blog Posts | X | 15 | X% | ... |
| Service/Product Pages | X | 15 | X% | ... |
| **OVERALL GEO SCORE** | **X** | **42** | **X%** | **...** |

Grade scale: A=90%+, B=80-89%, C=70-79%, D=60-69%, F=below 60%

### Per-Check Detail
After the scorecard, list every check that FAILED with:
- Check name
- What was found
- Exact fix required (specific, actionable)

### Priority Action List (Impact vs Effort matrix)
| Priority | Fix | Impact | Effort | Est. Time |
|---|---|---|---|---|
| 1 | [highest impact, lowest effort] | High | Low | [e.g. 30 min] |
| 2 | ... | | | |
| 3 | ... | | | |

### TOP 3 QUICK WINS
List the 3 fixes that will move the GEO score most, fastest.
Format: "Add FAQPage schema to [URL] — adds 1pt Blog score immediately."

### WHAT IS WORKING WELL
List 3-5 strengths already in place. These must be preserved when making fixes.

## BATCH AUDIT WORKFLOW (for 10-page audit)

When asked to batch audit multiple pages, run this process:

### Step 1 — Audit each page individually
Score each URL against all 3 dimensions. Record scores in a batch table.

### Step 2 — Identify systemic patterns
After all pages are scored, look for checks that fail on 3+ pages.
These are systemic issues — fix them site-wide before individual page optimization.

### Step 3 — Present batch results
| URL | General | Blog | Page | Total | Grade | Top Fix |
|---|---|---|---|---|---|---|
| /hotels/makkah | X/12 | X/15 | X/15 | X/42 | X | ... |
| /umrah-packages | ... | ... | ... | ... | ... | ... |

### Step 4 — Systemic fix list
"These issues appear on 5+ pages — fix once, win everywhere:"
1. [Issue] — affects [N] pages — fix: [specific action]
2. ...

### Step 5 — Individual page priority order
Rank pages by: (lowest score) + (highest traffic from GSC).
Fix lowest-scoring, highest-traffic pages first.

## STANDARD AUDIT PROMPT (copy and use)

```
Use the seo-audit skill to audit this URL: [YOUR-URL]

Please:
1. Fetch and read the page content
2. Score it against all 3 audit dimensions
3. Present results in the AI Search Starter Kit format
4. Identify the top 3 quick wins (highest impact, fastest to fix)
5. Generate a priority action list sorted by effort vs impact
```

## UTUBooking TOP 10 PAGES — BATCH AUDIT TARGET LIST

Run the standard audit prompt on each of these URLs in order:

| Priority | URL | Page Type | Why Audit First |
|---|---|---|---|
| 1 | https://utubooking.com/ | Homepage | Highest traffic, General dimension |
| 2 | https://utubooking.com/hotels/makkah/masjid-al-haram | Service page | Top conversion page |
| 3 | https://utubooking.com/umrah-packages | Service page | Second top conversion |
| 4 | https://utubooking.com/hajj-packages | Service page | Seasonal top earner |
| 5 | https://utubooking.com/hotels/madinah | Service page | High intent |
| 6 | https://utubooking.com/flights/jeddah-jed | Service page | High volume keyword |
| 7 | https://utubooking.com/car-rental/saudi-arabia | Service page | Long-tail cluster |
| 8 | https://utubooking.com/blog (first blog post) | Blog | Blog dimension |
| 9 | https://utubooking.com/blog (second blog post) | Blog | Blog dimension |
| 10 | https://utubooking.com/about | Brand page | E-E-A-T authority |

After all 10 are scored, ask: "Shall I generate a consolidated fix plan
prioritised by traffic x score gap?"
