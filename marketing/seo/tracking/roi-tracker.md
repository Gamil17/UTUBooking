# UTUBooking SEO ROI Tracker
**Updated:** Monthly by Marketing Manager
**Data sources:** Google Search Console, UTUBooking analytics, Claude Code session logs

---

## Monthly Scorecard Template

Copy this table at the start of each month and fill in at month-end.

### [Month Year] — SEO Content Report

| Metric | Target | Actual | Status |
|---|---|---|---|
| English posts published | 4 | | |
| Arabic posts published | 2 | | |
| Total words published (EN) | 7,200 | | |
| Total words published (AR) | 3,600 | | |
| FAQ schema blocks deployed | 20 | | |
| Internal links distributed | 24-28 | | |
| Human hours (briefs + reviews) | ≤3 hrs | | |

---

## Organic Traffic Benchmarks

Track these in Google Search Console. Set baseline in Month 1.

| Metric | Month 1 Baseline | Month 3 | Month 6 Target | Month 12 Target |
|---|---|---|---|---|
| Organic impressions | (set baseline) | | 10,000/mo | 50,000/mo |
| Organic clicks | (set baseline) | | 500/mo | 5,000/mo |
| Average CTR | (set baseline) | | 3-5% | 5-8% |
| Avg position (top posts) | (set baseline) | | top 20 | top 10 |
| Indexed blog posts | 0 | 8 | 24 | 48 |

---

## Post Performance Log

Add each published post here. Update monthly with GSC data.

| Post Slug | Publish Date | Primary Keyword | Impressions | Clicks | CTR | Avg Position | Bookings (UTM) |
|---|---|---|---|---|---|---|---|
| best-hotels-near-masjid-al-haram | 2026-03-25 | hotel near Masjid Al-Haram | | | | | |

---

## UTM Link Builder

All blog CTAs must use UTM tags. Build links using this formula:

```
Base URL + ?utm_source=blog&utm_medium=organic&utm_campaign=[POST-SLUG]&utm_content=[CTA-POSITION]
```

**CTA position values:**
- `intro` — CTA in the introduction section
- `mid` — CTA mid-post
- `conclusion` — CTA in the conclusion paragraph
- `faq` — CTA in FAQ answer

**Example links:**

| Destination | UTM-tagged URL |
|---|---|
| Makkah hotels | `/hotels/makkah?utm_source=blog&utm_medium=organic&utm_campaign=best-hotels-near-masjid-al-haram&utm_content=conclusion` |
| Umrah packages | `/umrah-packages?utm_source=blog&utm_medium=organic&utm_campaign=ramadan-umrah-guide&utm_content=intro` |
| Jeddah flights | `/flights/jeddah-jed?utm_source=blog&utm_medium=organic&utm_campaign=cheap-flights-jeddah&utm_content=conclusion` |
| Car rental SA | `/car-rental/saudi-arabia?utm_source=blog&utm_medium=organic&utm_campaign=car-rental-saudi-arabia&utm_content=mid` |
| Hajj packages | `/hajj-packages?utm_source=blog&utm_medium=organic&utm_campaign=hajj-packages-2026&utm_content=conclusion` |

**Claude prompt to generate UTM links for any post:**
```
"Generate all UTM-tagged CTA links for the blog post at marketing/seo/drafts/[FILENAME]-EN.md.
Use utm_source=blog, utm_medium=organic, utm_campaign=[post-slug].
Identify every CTA in the post and assign utm_content= intro/mid/conclusion/faq.
Output a table: CTA Text | Raw URL | UTM-tagged URL"
```

---

## Cost Per Post Analysis

| Item | Cost | Notes |
|---|---|---|
| Claude subscription | USD 20/month (Max plan) | Flat fee — covers all posts |
| Human editor time | [X hrs × USD Y/hr] | Part of existing team cost |
| Arabic reviewer | [USD Z/post] | External if no in-house reviewer |
| **Total cost/month** | | |
| **Posts produced/month** | 6 (4 EN + 2 AR) | |
| **Cost per post** | | Total ÷ posts |
| **Freelance equivalent** | USD 90-240/post | USD 15-40/post × 6 posts |
| **Savings vs freelance** | | Freelance cost − actual cost |

---

## Productivity Comparison

| Method | Time per post | Cost per post | Monthly output |
|---|---|---|---|
| Freelance SEO writer | 8 hours | USD 15-40 | 2-3 posts (budget) |
| In-house writer | 6 hours | USD 30-60 | 3-4 posts |
| **Claude SEO Skill** | **45 min (human)** | **~USD 3-5** | **6 posts** |
| Improvement | **8x faster** | **85-95% cheaper** | **2x more content** |

---

## Quarterly Goals

| Quarter | EN Posts | AR Posts | Organic Clicks Target | Key Focus |
|---|---|---|---|---|
| Q1 2026 | 12 | 6 | Baseline | Makkah hotels cluster |
| Q2 2026 | 12 | 6 | 500/mo | Umrah + Hajj season |
| Q3 2026 | 16 | 8 | 1,500/mo | Per-market posts (UK/US/CA) |
| Q4 2026 | 16 | 8 | 3,000/mo | Turkey/Indonesia/Malaysia cluster |

---

## Google Search Console Setup Checklist

Before tracking any data:

- [ ] Verify utubooking.com ownership in Google Search Console
- [ ] Submit sitemap: `https://utubooking.com/sitemap.xml`
- [ ] Connect GSC to Google Analytics (for blog-to-booking attribution)
- [ ] Create a custom GSC filter: Property → Pages → URLs containing `/blog/`
- [ ] Set up monthly GSC data export to Google Drive (via GDrive MCP when connected)
- [ ] Tag all blog CTAs with UTM parameters before publishing

---

## Red Flags — When to Pause and Audit

Stop the content engine and audit if any of these occur:

| Red Flag | Threshold | Action |
|---|---|---|
| Impressions drop | >20% month-over-month | Check for Google algorithm update; review SKILL.md |
| CTR drops below 1% | 2 consecutive months | Revise meta titles and TL;DR blocks |
| Zero bookings from UTM | After 3 months of content | Audit CTA pages and UTM tracking setup |
| Arabic posts flagged by users | Any complaint | Pause AR publishing; review with native speaker |
| Fact-check failures | Any published incorrect stat | Immediately correct; add stricter review step |
