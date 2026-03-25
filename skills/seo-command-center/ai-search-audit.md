# AI Search Starter Kit — Audit Scoring Framework (Video 19)
**Status:** Scaffold — scoring rubric will be populated from course Excel file (Part 3)
**Purpose:** Score UTUBooking.com across 3 dimensions to find quick AI-ranking wins.

---

## 3 Audit Dimensions

| Dimension | What It Measures | Score Range |
|---|---|---|
| **General** | Site-wide AI-readiness signals | 0-100 |
| **Blog** | Per-post Answer Capsule + schema compliance | 0-100 |
| **Page** | Individual page passage-level citability | 0-100 |

---

## General Dimension — Site-Wide Checks

| # | Signal | Status | Score |
|---|---|---|---|
| G1 | Site has FAQ schema JSON-LD on 50%+ of pages | | /10 |
| G2 | Homepage has a clear TL;DR / brand summary block | | /10 |
| G3 | Sitemap submitted and indexed in GSC | | /10 |
| G4 | Core Web Vitals passing (LCP < 2.5s, CLS < 0.1) | | /10 |
| G5 | HTTPS + valid SSL | | /5 |
| G6 | Mobile-first responsive layout | | /5 |
| G7 | Structured data: Organization + WebSite schema | | /10 |
| G8 | Robots.txt allows AI crawlers (GPTBot, Bingbot) | | /10 |
| G9 | Arabic RTL pages indexed separately (/ar/ paths) | | /10 |
| G10 | Brand mentions trackable via GSC query filters | | /10 |
| **Total** | | | **/100** |

---

## Blog Dimension — Per-Post Checks

Run this check on every published blog post. Target: 80+/100 per post.

| # | Signal | Status | Score |
|---|---|---|---|
| B1 | TL;DR / Answer Capsule present (30-80 words) | | /15 |
| B2 | Answer Capsule is self-contained (makes sense out of context) | | /15 |
| B3 | FAQ section with 5+ questions | | /10 |
| B4 | FAQ schema JSON-LD in page `<head>` | | /10 |
| B5 | Primary keyword in H1 and first 50 words | | /10 |
| B6 | H2 questions match real "People Also Ask" queries | | /10 |
| B7 | 4+ internal links to UTUBooking service pages | | /10 |
| B8 | Every stat has an inline source link | | /10 |
| B9 | Word count 1,500-2,500 | | /5 |
| B10 | Bilingual version exists (/ar/ path) | | /5 |
| **Total** | | | **/100** |

---

## Page Dimension — Individual Page Citability

Run this check on key service pages (/hotels/makkah, /umrah-packages, /hajj-packages, etc.)

| # | Signal | Status | Score |
|---|---|---|---|
| P1 | Page has a clear 1-2 sentence definition/description in first 100 words | | /20 |
| P2 | Key facts presented in scannable format (bullet list or table) | | /15 |
| P3 | Page answers at least one specific "how/what/when/where" question | | /15 |
| P4 | Price or data points cited with source | | /10 |
| P5 | H1 matches the most likely AI query for this page | | /15 |
| P6 | Meta description is 140-160 chars and includes primary keyword | | /10 |
| P7 | BreadcrumbList schema present | | /5 |
| P8 | Page loads in < 3 seconds (mobile) | | /10 |
| **Total** | | | **/100** |

---

## Audit Command (run in Claude Code once GSC + DataForSEO MCPs are live)

```
"Run the AI Search Audit on UTUBooking.com using the scoring framework
in skills/seo-command-center/ai-search-audit.md.

For the General dimension:
- Check GSC for sitemap submission status
- Check Core Web Vitals from GSC Page Experience report
- Verify robots.txt at https://utubooking.com/robots.txt

For the Blog dimension (run on last 5 published posts):
- Check each post URL for TL;DR presence
- Check GSC for FAQ rich result status
- Check internal link count per post

For the Page dimension (run on: /hotels/makkah, /umrah-packages, /hajj-packages):
- Check meta descriptions via DataForSEO
- Check page load time via DataForSEO OnPage API

Output a completed scorecard table for each dimension.
Flag any score below 60 as a PRIORITY FIX.
Save the audit report to marketing/seo/reports/YYYY-MM-DD-ai-search-audit.md"
```

<!-- Part 3 from the course guide will add the full Excel-derived scoring rubric here -->
