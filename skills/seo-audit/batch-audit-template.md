# UTUBooking Batch SEO Audit — AI Search Starter Kit
**Run this:** Paste the prompt block for each URL into Claude Code with seo-audit skill active.
**Output goes to:** `marketing/seo/reports/YYYY-MM-DD-batch-audit.md`

---

## Single Page Audit Prompt (copy for each URL)

```
Use the seo-audit skill to audit this URL: [PASTE URL HERE]

Please:
1. Fetch and read the page content
2. Score it against all 3 audit dimensions (General, Blog, Page)
3. Present results in the AI Search Starter Kit scorecard format
4. Identify the top 3 quick wins (highest impact, fastest to fix)
5. Generate a priority action list sorted by effort vs impact
```

---

## Full Batch Audit Prompt (runs all 10 pages in one session)

```
Use the seo-audit skill to run a batch audit on these 10 UTUBooking pages:

1. https://utubooking.com/
2. https://utubooking.com/hotels/makkah/masjid-al-haram
3. https://utubooking.com/umrah-packages
4. https://utubooking.com/hajj-packages
5. https://utubooking.com/hotels/madinah
6. https://utubooking.com/flights/jeddah-jed
7. https://utubooking.com/car-rental/saudi-arabia
8. https://utubooking.com/blog/best-hotels-near-masjid-al-haram
9. https://utubooking.com/blog/umrah-travel-checklist
10. https://utubooking.com/about

For each page:
- Fetch and read the page content
- Score across all 3 dimensions (General/12, Blog/15, Page/15)
- Note the top 1 fix per page

After all 10 pages:
- Present a consolidated batch scorecard table
- Identify systemic issues (failing on 3+ pages)
- Rank pages by: lowest score + highest traffic (use GSC MCP if connected)
- Output a master fix list sorted by: impact x effort
- Save the full report to marketing/seo/reports/YYYY-MM-DD-batch-audit.md
```

---

## Batch Scorecard Template (Claude fills this in)

| # | URL | General /12 | Blog /15 | Page /15 | Total /42 | Grade | #1 Fix |
|---|---|---|---|---|---|---|---|
| 1 | / | | | | | | |
| 2 | /hotels/makkah/masjid-al-haram | | | | | | |
| 3 | /umrah-packages | | | | | | |
| 4 | /hajj-packages | | | | | | |
| 5 | /hotels/madinah | | | | | | |
| 6 | /flights/jeddah-jed | | | | | | |
| 7 | /car-rental/saudi-arabia | | | | | | |
| 8 | /blog post 1 | | | | | | |
| 9 | /blog post 2 | | | | | | |
| 10 | /about | | | | | | |
| **Average** | | | | | | | |

---

## Common Quick Wins (most frequently found across travel sites)

Fix these first — they appear on almost every site and take under 30 minutes each:

| Fix | Dimension | Points Gained | Effort |
|---|---|---|---|
| Add FAQPage JSON-LD schema to all blog posts | Blog | +1pt per post | 20 min/post |
| Rewrite H1s as questions matching search intent | Blog + Page | +1pt per page | 10 min/page |
| Add Answer Capsule to first 60 words of each post | Blog | +1pt per post | 15 min/post |
| Add named author + bio to all blog posts | Blog (E-E-A-T) | +2pts per post | 30 min total |
| Add Organization schema to homepage | General | +1pt site-wide | 20 min once |
| Add last-updated date to posts older than 90 days | Blog (E-E-A-T) | +1pt per post | 5 min/post |
| Add UTUBooking contact info to footer/about | General | +1pt site-wide | 15 min once |
| Add BreadcrumbList schema to service pages | Page | +1pt per page | 30 min total |

---

## Grading Reference

| Grade | Score | % | What It Means |
|---|---|---|---|
| A | 38-42 | 90-100% | AI-ready. Appearing in AI Overviews. |
| B | 34-37 | 80-89% | Strong. A few quick wins to reach A. |
| C | 29-33 | 70-79% | Average. Systemic gaps likely. |
| D | 25-28 | 60-69% | Below average. Multiple fixes needed. |
| F | 0-24 | <60% | Not AI-ready. Start with common quick wins. |

**UTUBooking target:** All top 10 pages at grade B or above within 30 days of first audit.
**Stretch goal:** All blog posts at grade A within 60 days (Answer Capsules + FAQ schema = most of the gain).
