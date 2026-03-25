---
name: keyword-research
description: |
  Activates when asked to research keywords, build a content cluster,
  find keyword gaps, or analyze what topics to target. Uses DataForSEO
  MCP if connected, otherwise conducts structured web research.
---

# Keyword Research Skill

## WORKFLOW

### Step 1: Understand the Goal
Ask: What is the primary topic/service? What is the target market/location?
     What stage — discovery, consideration, or purchase intent?

### Step 2: Seed Keyword Expansion
Generate 20-30 seed keywords across three tiers:
- Tier 1 (High Intent): transactional, bottom-funnel ('buy', 'hire', 'price')
- Tier 2 (Informational): how-to, what-is, best-way questions
- Tier 3 (Long-tail): specific location + service + modifier combinations

### Step 3: Research Each Tier
If DataForSEO MCP is connected:
  - Use dataforseo.keywords_for_keywords for each seed
  - Pull: search volume, CPC, competition, trend direction
  - Use dataforseo.serp_google for top 10 results per priority keyword

If DataForSEO is NOT connected:
  - Run web searches: 'keyword + site:semrush.com' for volume estimates
  - Run web searches: 'People Also Ask: [topic]' for question keywords
  - Run web searches: '[competitor] site:ahrefs.com' for gap analysis

### Step 4: Prioritize and Present
Score each keyword on: Volume x Intent x Difficulty inverse
Present as a prioritized table:

| Keyword | Est. Volume | Intent | Difficulty | Priority |
| ... | ... | ... | ... | High/Medium/Low |

### Step 5: Build Content Cluster Map
Group keywords into a pillar + cluster structure:
- 1 Pillar Page (high volume, broad keyword)
- 4-8 Cluster Posts (specific, lower competition, support pillar)
- Internal linking plan between pillar and clusters

Present as a visual cluster map in text format.
