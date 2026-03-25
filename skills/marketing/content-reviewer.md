---
name: content-reviewer
description: Quality checklist for any UTUBooking content before publishing.
  Use after generating any blog post, email, ad copy, or social post. Scores
  15 factors across voice, SEO, accuracy, and brand compliance. Outputs a
  pass/fail checklist with specific fix instructions for any failures.
---

# Content Reviewer

Run this after any content is generated and before it is published or sent.
Reference: skills/seo-content-writer/references/tone-of-voice.md
Anti-slop: run skills/anti-slop.md as part of this review

## 15-Point Quality Checklist

### Voice & Tone (5 checks)
| # | Check | Pass/Fail | Fix Required |
|---|---|---|---|
| V1 | No Tier 1 banned phrases (see anti-slop.md) | | |
| V2 | No em dashes | | |
| V3 | Active voice throughout | | |
| V4 | Contractions used naturally (you'll, it's, don't) | | |
| V5 | 'pilgrim/traveler' not 'tourist' for Makkah/Madinah context | | |

### Accuracy & Brand (4 checks)
| # | Check | Pass/Fail | Fix Required |
|---|---|---|---|
| A1 | All prices, distances, and statistics are specific (not vague) | | |
| A2 | No competitor names in negative context | | |
| A3 | No 'guaranteed results' or unverifiable claims | | |
| A4 | UTUBooking features cited correctly (proximity filter, halal filter, multi-currency) | | |

### SEO (3 checks — blog posts only)
| # | Check | Pass/Fail | Fix Required |
|---|---|---|---|
| S1 | Primary keyword in title + first 50 words | | |
| S2 | FAQ section present with 3+ questions | | |
| S3 | 3-5 internal links from sitemap.csv | | |

### Format (3 checks)
| # | Check | Pass/Fail | Fix Required |
|---|---|---|---|
| F1 | Paragraphs max 2-4 sentences | | |
| F2 | CTA present and specific (not 'Click here') | | |
| F3 | Arabic content flagged [REVIEW: native speaker] if present | | |

## Scoring
- 13-15 passed: publish-ready
- 10-12 passed: minor fixes required (list them)
- Below 10: return to author with specific revision notes

## Output Format
1. Completed checklist table
2. List of failed checks with exact fix instructions
3. Final verdict: PUBLISH READY / MINOR FIXES / NEEDS REVISION
