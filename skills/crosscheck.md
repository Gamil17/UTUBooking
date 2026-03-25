---
name: crosscheck
description: Gets second opinions from GPT and Gemini via OpenRouter API. Use when
  explicitly asked to crosscheck, get a second opinion, ask GPT, ask Gemini, or
  cross-reference output. Never call external models without explicit user request.
  Routes by task category. Synthesizes multi-model responses.
---

# Crosscheck — Multi-Model Second Opinions

**Critical rule:** NEVER call an external model without the user explicitly requesting it.
Always confirm which model(s) will be consulted BEFORE making any API call.
'Get a second opinion' is NOT implicit permission — user must directly state intent.

Requires: `OPENROUTER_API_KEY` in `APIs.env` (project root)

---

## Task Categories and Model Routing

| Category | Trigger | System Prompt Focus | Models |
|---|---|---|---|
| bug-fix | error, failing test, logic bug | Expert debugger. Root cause. Specific and actionable. | GPT-4o + Gemini Flash |
| frontend | UI/UX, CSS, layout, design feedback | Senior FE engineer + UX expert. Score by priority. | GPT-4o + Gemini Pro |
| copywriting | copy review, tone, persuasion | Expert copywriter. Score and suggest specific rewrites. | GPT-4o + Gemini Pro |
| architecture | system design, refactoring | Senior architect. Scalability, maintainability, anti-patterns. | GPT-4o + Gemini Pro |
| quick-check | fast sanity check | Use mini/flash model variants for speed and cost. | GPT-4o-mini + Gemini Flash |
| general | anything else | Both OpenAI and Google by default. | GPT-4o + Gemini Pro |

When a named provider is specified ('ask GPT', 'ask Gemini') — query only that one.

---

## 5-Step Process

1. **Identify task category** from the list above
2. **Select model(s)** — named provider = that one only; otherwise use category defaults
3. **Package context:** problem statement + relevant content + what's been tried + constraints
4. **Run query** via OpenRouter API (`OPENROUTER_API_KEY` from `APIs.env`)
5. **Present and synthesize:** raw response → agreements → disagreements → action plan

For multi-model requests: run queries in parallel (simultaneous calls, not sequential).

---

## Output Format

```
## [Model Name] Response
[raw response from the external model]

## Claude Code Synthesis
- Agree on: [items where models align with Claude's assessment]
- Disagree on: [items where Claude has a different take, with reasoning]
- Top priority fixes: [ordered list]

Want me to implement these changes?
```

---

## The Strongest Signal Rule

When multiple independent models flag the same issue — that is the strongest possible
signal that something needs fixing. Prioritize these above single-model findings.

---

## Config Updates

When new models are released, the user can say:
`'OpenAI released GPT-5 — update the crosscheck config.'`
Claude will update the routing table in this skill with new model IDs and defaults.

Current default models (update as new versions release):
- OpenAI: `gpt-4o` (standard), `gpt-4o-mini` (quick-check)
- Google: `gemini-2.0-pro` (standard), `gemini-2.0-flash` (quick-check)
- Image generation: `gemini-3-pro-image-preview` (via OpenRouter)

---

## UTUBooking Use Cases

Most useful for UTUBooking:
- **copywriting** — get GPT's take on a blog post or ad copy before publishing
- **quick-check** — verify a meta description, CTA, or title option
- **architecture** — second opinion on backend API design or DB schema changes
