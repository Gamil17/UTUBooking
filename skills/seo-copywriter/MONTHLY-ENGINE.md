# UTUBooking SEO Monthly Content Engine
**Version:** 1.0 — March 2026
**Target output:** 4 EN posts + 2 AR posts per month
**Human time investment:** ~3 hours/month

---

## Monthly Workflow Calendar

### Week 1 — Planning & Post 1

**Monday (30 min human):**
```
Batch the month's keyword briefs into the content calendar.
Pull 4-5 keywords from skills/seo-copywriter/keywords/target-keywords.md.
Prioritise: 1 Tier 1 (transactional) + 2 Tier 2 (informational) + 1 per-market.

Use this Claude prompt to populate Notion:
"Read the UTUBooking master keyword list at skills/seo-copywriter/keywords/target-keywords.md.
Create 4 content calendar entries in the Notion SEO Content Calendar database with these fields:
Title (proposed H1), Primary Keyword, Market, Target CTA Page, Status = Briefing,
Target Publish Date (spread across the month), Assigned = Claude SEO Skill."
```

**Tuesday-Wednesday (Claude runs, 15 min human review):**
```
Use the SEO Copywriter Skill brief template from SEO-QUICK-START.md.
Claude runs Steps 1-3, presents outline → human approves → Claude writes full post.
Output saved to marketing/seo/drafts/YYYY-MM-DD-[slug]-EN.md
Update Notion status: Briefing → Draft Ready
Post Slack alert to #marketing: "Post 1 draft ready for review: [TITLE]"
```

**Thursday-Friday (editor review):**
- Verify all source links are live and accurate
- Check word count 1,600-2,000 words
- Run the Step 5D Post Review Checklist from SEO-QUICK-START.md
- Request any revisions from Claude if needed
- Update Notion status: Draft Ready → Approved

---

### Week 2 — Post 1 Published + Post 2 Draft

**Monday:**
- Upload Post 1 Markdown to CMS
- Paste FAQ JSON-LD into page `<head>`
- Add UTM tags to all CTA links: `?utm_source=blog&utm_medium=organic&utm_campaign=[slug]`
- Submit URL to Google Search Console for indexing
- Update Notion status: Approved → Published ✓

**Tuesday-Wednesday (Claude runs, 10 min human review):**
```
Trigger Post 2 using SEO-QUICK-START.md brief template.
Same flow: outline approval → full post → Notion + Slack notification.
```

---

### Week 3 — Post 2 Published + Arabic Versions

**Monday:**
- Publish Post 2 (same CMS steps as Week 2)

**Tuesday-Thursday (Claude runs Arabic versions):**
```
For each approved English post, trigger Arabic translation:

"Using the SEO Copywriter Skill, generate the Arabic version of the post saved at
marketing/seo/drafts/[filename]-EN.md.
Use the arabic-template.md structure.
Apply dir='rtl' and lang='ar' HTML wrapper notes.
Translate all FAQ schema name and text fields.
Flag any phrase requiring native speaker review with [REVIEW].
Save output to marketing/seo/drafts/[filename]-AR.md"
```

**Friday:**
- Arabic posts reviewed by native Gulf Arabic speaker (external or internal)
- Approved Arabic versions uploaded to `/ar/` CMS paths
- Update Notion: EN Published → AR In Review → AR Published ✓

---

### Week 4 — Post 3 + Monthly SEO Report

**Monday-Wednesday:**
- Trigger Post 3 or Post 4 using standard brief flow

**Thursday (Claude generates SEO report, 5 min human review):**
```
"Using the Notion MCP, read all posts published this month from the UTUBooking SEO
Content Calendar. For each post, retrieve: Title, Publish Date, Primary Keyword,
CTA Page, Word Count. Generate a monthly SEO report in this format:

## UTUBooking SEO Monthly Report — [Month Year]

### Posts Published
[Table: Title | Keyword | Published | CTA Page | Word Count]

### Content Stats
- Total EN posts: X
- Total AR posts: X
- Total words published: X
- FAQ schema blocks deployed: X
- Internal links distributed: X

### Keyword Pipeline
- Posts published vs target: X/4 EN, X/2 AR
- Top 3 keyword opportunities for next month (from target-keywords.md)

### Action Items for Next Month
[3 bullet points based on gaps or opportunities]

Save this report to marketing/seo/reports/YYYY-MM-monthly-seo-report.md
and post a summary to #marketing Slack."
```

---

## Monthly Output Targets

| Metric | Phase 1 Target | Phase 2 Target (Month 7+) |
|---|---|---|
| English posts | 4 posts/month | 6 posts/month |
| Arabic posts | 2 posts/month | 4 posts/month |
| Total words | 7,200 EN + 3,600 AR | 10,800 EN + 7,200 AR |
| FAQ schema blocks | 20 (5 per post) | 30 |
| Internal links | 24-28 | 36-42 |
| Human time | ~3 hours/month | ~4 hours/month |

---

## Notion Content Calendar Schema

When setting up the Notion database, use these exact field names
(the Claude prompts above reference them by name):

| Field Name | Type | Values |
|---|---|---|
| Title | Title | Proposed H1 |
| Primary Keyword | Text | Target search term |
| Market | Select | KSA / UAE / UK / US / CA / TR / ID / MY / PK / IN / Global |
| Target CTA Page | URL | UTUBooking page path |
| Status | Select | Briefing / Outline Approved / Draft Ready / Approved / Published ✓ / AR In Review / AR Published ✓ |
| Language | Multi-select | EN / AR |
| Publish Date | Date | Target publish date |
| Assigned | Select | Claude SEO Skill / Human Editor / AR Reviewer |
| Word Count | Number | Actual word count on approval |
| CMS URL | URL | Live URL after publishing |
| UTM Campaign | Text | slug for UTM tagging |
| Google Search Console | URL | GSC performance link |

---

## Slack Notification Templates

Add these lines to any brief to trigger auto-notifications:

**On draft ready:**
```
After saving the draft, post to Slack #marketing channel:
"📝 New SEO draft ready for review
Post: [TITLE]
Keyword: [PRIMARY KEYWORD]
Market: [MARKET]
File: marketing/seo/drafts/[FILENAME]
Action needed: editorial review + fact-check within 48 hours"
```

**On Arabic version ready:**
```
After saving the Arabic draft, post to Slack #marketing channel:
"🌐 Arabic version ready for native speaker review
Post: [TITLE] (AR)
File: marketing/seo/drafts/[FILENAME]-AR.md
Action needed: native Gulf Arabic speaker review before CMS upload"
```

---

## Keyword Pipeline Refresh (Quarterly)

At the start of each quarter, run this Claude prompt to refresh the keyword list:

```
"Run 10 web searches to find new keyword opportunities for UTUBooking.com SEO:
1. Search: 'Umrah travel [current year] search trends'
2. Search: 'Makkah hotel booking keywords [current year]'
3. Search: top Almosafer blog posts by traffic (site:almosafer.com)
4. Search: top Wego blog posts by traffic (site:wego.com)
5. Search: 'People Also Ask' for 'best hotels Makkah'
6. Search: Google Trends KSA: top rising travel queries
7. Search: 'Hajj packages [current year]' — note PAA questions
8. Search: new Gulf markets UTUBooking could target (tourism board reports)
9. Search: seasonal travel spikes KSA/UAE [current year]
10. Search: competitor content gaps — what are Almosafer and Wego NOT covering?

Then update skills/seo-copywriter/keywords/target-keywords.md with:
- 5 new Tier 1 keywords found
- 5 new Tier 2 keywords found
- 3 new seasonal/trending keywords
- Updated competitor gap analysis section"
```
