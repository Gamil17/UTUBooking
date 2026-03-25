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
Present results as:
| Category | Score | Max | % | Grade |
| General/Site-Wide | X | 12 | X% | A/B/C/D/F |
| Blog Posts | X | 15 | X% | ... |
| Service/Product Pages | X | 15 | X% | ... |
| OVERALL GEO SCORE | X | 42 | X% | ... |

Grade scale: A=90%+, B=80%, C=70%, D=60%, F=below 60%

Then list: TOP 3 PRIORITY FIXES (highest impact, lowest effort first)
Then list: WHAT IS WORKING WELL (strengths to preserve)
