# UTUBooking SEO Copywriter — Quick Start Guide
**For:** Marketing team / content editors
**Skill location:** `skills/seo-copywriter/SKILL.md`

---

## How to Trigger the Skill

Open Claude Code in VS Code with the UTUBooking project folder loaded.
Then paste the brief below, filling in the brackets.

---

## Step 5B Brief Template — Copy & Paste

```
Use the SEO Copywriter Skill to create a blog post for UTUBooking.com.

Primary keyword: [INSERT KEYWORD from target-keywords.md]
Content angle: [one sentence describing the specific angle or traveler pain point]
Target word count: 1,800 words
CTA goal: [what you want the reader to do — book a hotel / search flights / explore packages]
UTUBooking advantage: [one UTUBooking feature relevant to this post — e.g. Haram proximity filter / halal filter / Aeroplan miles on AC flights]
Market: [KSA / UAE / UK / US / CA / TR / ID / MY / PK / IN / Global]
Language: [English only / English + Arabic]

Start with Step 1 (Setup) and present the outline before writing.
```

---

## Example Briefs (Ready to Use)

### Brief 1 — Makkah Hotels (Tier 1, KSA)
```
Use the SEO Copywriter Skill to create a blog post for UTUBooking.com.

Primary keyword: best hotels near Masjid Al-Haram Makkah 2026
Content angle: practical proximity guide for Umrah travelers — 3 distance zones with budget options at each
Target word count: 1,800 words
CTA goal: get readers to use UTUBooking's Haram proximity filter and book a hotel
UTUBooking advantage: Haram proximity filter showing walking time to nearest gate for 200+ properties
Market: Global (KSA primary)
Language: English + Arabic

Start with Step 1 (Setup) and present the outline before writing.
```

### Brief 2 — Ramadan Umrah (Seasonal)
```
Use the SEO Copywriter Skill to create a blog post for UTUBooking.com.

Primary keyword: Ramadan Umrah guide 2026
Content angle: complete planning guide — when to book, what to expect, which hotels to choose during the last 10 nights
Target word count: 1,800 words
CTA goal: book Ramadan Umrah hotel or package through UTUBooking before availability runs out
UTUBooking advantage: early price alerts for Ramadan hotel availability
Market: Global (KSA/UAE primary)
Language: English + Arabic

Start with Step 1 (Setup) and present the outline before writing.
```

### Brief 3 — Umrah from the UK (Market-Specific)
```
Use the SEO Copywriter Skill to create a blog post for UTUBooking.com.

Primary keyword: Umrah packages from the UK 2026
Content angle: complete guide for British Muslims — flights, visa, hotel proximity, costs in GBP
Target word count: 1,800 words
CTA goal: book Umrah package or hotel through UTUBooking, with GBP pricing
UTUBooking advantage: GBP pricing, UK-relevant flight options, halal-certified hotels
Market: UK (GB)
Language: English only

Start with Step 1 (Setup) and present the outline before writing.
```

### Brief 4 — Car Rental Saudi Arabia (High Intent)
```
Use the SEO Copywriter Skill to create a blog post for UTUBooking.com.

Primary keyword: car rental Saudi Arabia 2026
Content angle: practical guide — driving rules, best pickup cities (Jeddah/Riyadh/Madinah), what pilgrims need to know
Target word count: 1,800 words
CTA goal: search and book a car rental in Saudi Arabia on UTUBooking
UTUBooking advantage: SAR pricing, pickup available at JED airport and Madinah
Market: Global (pilgrims traveling between Makkah and Madinah)
Language: English + Arabic

Start with Step 1 (Setup) and present the outline before writing.
```

### Brief 5 — Flights to Jeddah (Transactional)
```
Use the SEO Copywriter Skill to create a blog post for UTUBooking.com.

Primary keyword: cheap flights to Jeddah 2026
Content angle: how to find the best deal — best airlines, booking windows, Hajj season price spikes
Target word count: 1,800 words
CTA goal: search and book flights to Jeddah (JED) on UTUBooking
UTUBooking advantage: Amadeus GDS pricing, multiple airline options including Gulf carriers
Market: Global
Language: English + Arabic

Start with Step 1 (Setup) and present the outline before writing.
```

---

## Step 5C Outline Approval Checklist

When Claude presents the outline, verify all 5 points before approving:

- [ ] Search intent analysis is correct for the Umrah/Gulf audience
- [ ] ~60% of H2 sections are marked CAPSULE (not all editorial)
- [ ] 4-7 internal UTUBooking page links are identified with descriptive anchor text
- [ ] 8-15 credible sources listed with specific data points (not vague references)
- [ ] FAQ section includes 5 questions that match real "People Also Ask" queries

If everything checks out, type:
```
approved — write the full post
```

---

## Step 5D Post Review Checklist

When the post is delivered, verify before sending to CMS:

- [ ] TL;DR present at top (50-80 words, self-contained)
- [ ] Primary keyword in title, first paragraph, and 2-3 H2 headings
- [ ] Every stat has an inline source link (not a dead link)
- [ ] 4-7 UTUBooking internal links with natural anchor text
- [ ] Zero em dashes in the post
- [ ] Paragraphs are 2-4 sentences max
- [ ] 5 FAQ answers are each complete and self-contained
- [ ] FAQ Schema JSON-LD block delivered separately
- [ ] Word count 1,600-2,000 (use VS Code word count or paste into Word)
- [ ] After approval, request Arabic version: `Generate the Arabic version and meta title + meta description`

---

## MCP Automation (Once MCPs Are Connected)

When Notion + Slack MCPs are active, add this to the end of every brief:

```
After delivering the post:
1. Save the brief to the UTUBooking SEO Content Calendar in Notion, status = "Draft Ready"
2. Post a message to the #marketing Slack channel: "New SEO draft ready for review: [POST TITLE] — [brief description]"
3. Save the full Markdown post to Google Drive in the UTUBooking/SEO Drafts folder
```

---

## Output File Naming Convention

```
marketing/seo/drafts/YYYY-MM-DD-[slug]-EN.md       ← English post
marketing/seo/drafts/YYYY-MM-DD-[slug]-AR.md       ← Arabic post
marketing/seo/drafts/YYYY-MM-DD-[slug]-schema.json ← FAQ JSON-LD only
marketing/seo/briefs/YYYY-MM-DD-[slug]-brief.md    ← Keyword brief
```

---

## Content Calendar (Monthly Target)

| Week | Post Type | Market | Language |
|---|---|---|---|
| Week 1 | Tier 1 transactional (hotels/flights) | KSA/Global | EN + AR |
| Week 2 | Tier 2 informational guide | Global | EN + AR |
| Week 3 | Per-market Umrah post | UK / CA / TR / etc. | EN only |
| Week 4 | Long-tail / seasonal | Global | EN + AR |

**Monthly output:** 4 English posts + 2-3 Arabic translations = 6-7 pieces of SEO content.

---

## Reference Files

| File | Purpose |
|---|---|
| `SKILL.md` | Full skill — 4-step workflow and all writing rules |
| `templates/post-template.md` | CMS-ready post scaffold |
| `templates/arabic-template.md` | Arabic RTL scaffold |
| `templates/faq-schema.json` | FAQ JSON-LD base template |
| `keywords/target-keywords.md` | Master keyword list (Tier 1/2/3 + Arabic) |
| `examples/sample-post-en.md` | Annotated sample post showing Answer Capsule technique |
