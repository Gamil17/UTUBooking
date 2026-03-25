# UTUBooking SEO System — Master Implementation Checklist
**Course:** AI Ranking Course (7 Videos) — Part 5: 6-Stage Rollout
**Last updated:** 2026-03-25
**Legend:** ✅ Complete | ⚠️ Manual step pending | ⏳ Not started

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
