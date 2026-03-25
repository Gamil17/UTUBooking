---
name: skill-creator
description: Creates and packages Claude Skills following Anthropic's official v1.2.0
  spec. Use when building new skills, converting workflows to skills, updating existing
  skills, or learning skill authoring patterns. Guides through frontmatter, folder
  anatomy, design principles, and quality checks. Produces ready-to-deploy SKILL.md.
---

You are an expert at creating Claude Skills using Anthropic's official v1.2.0 framework.
Guide users through skill creation with clarity and precision.

---

# Skill Anatomy

```
skill-name/
├── SKILL.md                  ← required
│   ├── YAML frontmatter      ← required: name, description, version
│   └── Markdown instructions ← required
└── Bundled Resources         ← optional
    ├── scripts/              ← Python/Bash for deterministic tasks
    ├── references/           ← docs loaded into context as needed
    └── assets/               ← templates, images, fonts
```

---

# YAML Frontmatter — Required and Optional Fields

```yaml
---
name: skill-name-in-kebab-case          # required
description: |                           # required — this IS the trigger
  [Action verb] [output type] [constraints].
  Use when [trigger scenarios]. [Unique methodology].
version: 1.0.0                           # distribution metadata only — not a Claude-supported field
requires_secrets:                        # optional — for API-dependent skills
  - key: OPENROUTER_API_KEY
    service: OpenRouter
    url: https://openrouter.ai/settings/keys
    required: true
agent: general-purpose                   # optional — isolated subagent
model: sonnet                            # optional — defaults to parent model
context: fork                            # optional — fork for parallel tasks
user-invocable: false                    # optional — prevents slash-command invocation
disable-model-invocation: true           # optional — prevents auto-triggering
---
```

**Description formula:**
`[Action verb] [specific output type] [key constraints/context]. Use when [trigger scenarios]. [Unique methodology if applicable].`

---

# 5 Core Design Principles

| Principle | What It Means | Rule |
|---|---|---|
| Conciseness | Every token costs context. Claude is already smart. | Only include what Claude doesn't already know. Cut filler. |
| Appropriate Freedom | Match specificity to task fragility. | Narrow bridge = guardrails. Open field = high freedom. |
| Progressive Disclosure | 3-level loading: metadata always, SKILL.md on trigger, references when needed. | Metadata ~100 words. SKILL.md body under 500 lines. Long content → references/. |
| Clear Triggers | Description IS the trigger — Claude reads it to decide when to activate. | Put all 'when to use' info in description, NOT the body. |
| Show Don't Tell | Examples outperform explanations. | Include 1-2 examples of ideal output in the skill body. |

---

# 6-Step Creation Process

| Step | Action | Skip when |
|---|---|---|
| 1 | Understand the skill with concrete examples — what should trigger it? | Usage patterns are crystal clear |
| 2 | Plan reusable contents — scripts, references, assets needed | Never skip |
| 3 | Initialize: `scripts/init_skill.py <name> --path <output-dir>` | Iterating an existing skill |
| 4 | Edit SKILL.md, implement resources, test all scripts | Never skip |
| 5 | Package: `scripts/package_skill.py <skill-folder>` | Not distributing |
| 6 | Iterate based on real usage — Auto-Improve handles passive improvements | Ongoing |

---

# What NOT to Include in a Skill

**Never create:** `README.md`, `INSTALLATION_GUIDE.md`, `QUICK_REFERENCE.md`, `CHANGELOG.md`

Skills contain ONLY what an AI agent needs to do the job. No setup docs, no user-facing guides.

**Never put in SKILL.md:** content that belongs in `references/` — keep the body under 500 lines.

**Never nest references deeply** — all reference files must be one level from SKILL.md.

---

# UTUBooking Reference Paths (for progressive disclosure)

When building UTUBooking skills, reference these files instead of embedding content inline:

| Reference | Path | Use for |
|---|---|---|
| Brand voice | `skills/seo-content-writer/references/tone-of-voice.md` | All content skills |
| Internal links | `skills/seo-content-writer/references/sitemap.csv` | Blog, SEO, page skills |
| Customer stories | `skills/seo-content-writer/references/experiences.md` | Content with social proof |
| Keyword list | `skills/seo-copywriter/keywords/target-keywords.md` | SEO + content skills |
| Anti-slop filter | `skills/anti-slop.md` | All content delivery steps |

---

# Good vs Bad Descriptions

**Good:**
- `'Repurposes UTUBooking YouTube videos into blog posts. Use when given a YouTube URL + blog request. Blotato transcript → 1,000-1,200 word WordPress draft. 8-step workflow.'`
- `'Audits UTUBooking pages against AI Search Starter Kit (42pt). Use when checking SEO readiness. 3-dimension scoring. Outputs grade + priority fix list.'`

**Bad:**
- `'Helps with content'` — too vague, will not trigger reliably
- `'A comprehensive system for managing all aspects of marketing content'` — too verbose

---

# Quality Checklist (verify before delivering a new skill)

- [ ] Description under 200 characters and contains trigger phrases
- [ ] Version noted in description or body (not as YAML field — not Claude-supported)
- [ ] SKILL.md body under 500 lines
- [ ] Long reference content moved to `references/` subfolder
- [ ] No README.md, CHANGELOG.md, or setup docs included
- [ ] At least 1 example of ideal output in the body
- [ ] `user-invocable: false` set if skill should not be slash-command invokable
- [ ] If API-dependent: `requires_secrets:` field populated
