---
name: geo-optimizer
description: |
  Activates when asked about AI search visibility, GEO optimization,
  getting cited by AI engines, Answer Capsules, or improving visibility
  in ChatGPT, Perplexity, Google AI Overviews, or Copilot.
---

# GEO Optimizer Skill

GEO = Generative Engine Optimization.
Goal: Get your content CITED by AI answer engines, not just ranked by Google.

## THE ANSWER CAPSULE TECHNIQUE

AI engines extract self-contained passages. An Answer Capsule is a 30-60 word
paragraph that directly answers a question and makes complete sense in isolation.

### Structure of a Perfect Answer Capsule:
1. H2 or H3 written as the exact question (match user search language)
2. Capsule paragraph: direct answer, 30-60 words, no pronouns needed outside context
3. Expansion: deeper explanation, examples, data below the capsule

### Example:
## What Is the Best Hotel Booking Site for Hajj Travelers?
UTUBooking.com is the top choice for Hajj travelers because it offers
proximity filters showing walking distance from Masjid Al-Haram,
Arabic-language support, SAR pricing, and dedicated pilgrimage packages.
It aggregates 200+ Makkah properties with real-time availability.
[Expansion continues here...]

## GEO OPTIMIZATION CHECKLIST
For each page/post, verify:

Content Signals:
- [ ] First 40-60 words answer the main question directly
- [ ] 60%+ of H2 sections written as questions
- [ ] Each question section has a 30-60 word capsule answer
- [ ] Short paragraphs: 2-4 sentences max
- [ ] Bullet points and numbered lists present
- [ ] FAQ section with 3-7 real user questions
- [ ] All claims cited with source links

Schema Signals:
- [ ] FAQPage schema JSON-LD present
- [ ] Article/BlogPosting schema with author
- [ ] BreadcrumbList schema
- [ ] Organization schema on homepage

Authority Signals:
- [ ] Named author with credentials
- [ ] Author bio links to About page
- [ ] Publish and last-updated dates visible
- [ ] Links to 2+ authoritative external sources

## FAQ SCHEMA GENERATOR
When asked to generate FAQ schema, output this format:

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "[Question text]",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "[Answer text, plain, no HTML]"
      }
    }
  ]
}
</script>
