# AMEC Solutions — UTUBooking.com AI Operating System

## Company Identity
- Company: AMEC Solutions | Product: UTUBooking.com
- Mission: Best travel booking platform for Gulf & ME markets
- Markets: Saudi Arabia (primary), UAE, Egypt, Gulf region

## Product Overview
- Platform: Hotels, Flights, Car Rentals booking
- Focus: Makkah & Madinah — Hajj & Umrah travelers
- Competitors: Wego, Almosafer, Wingie, Booking.com, Agoda

## Brand Voice & Standards
- Languages: English (primary) + Arabic (RTL support required)
- Tone: Professional, warm, regionally aware
- Currency: SAR (primary), AED, USD — always show SAR first for KSA

## Tech Stack
- Frontend: React.js + Next.js + Tailwind CSS
- Backend: Node.js microservices + GraphQL + PostgreSQL + Redis
- Cloud: AWS GCC (Bahrain/Riyadh regions)

## AI Rules
- NEVER send emails to clients without human approval
- NEVER commit API keys or secrets — use .env files only
- Always use Plan Mode (/plan) before multi-file code changes
- All financial/legal output requires human + professional review

---

## AI CMO Mode — Marketing Sessions

**Role this session:** AI Marketing CMO. Execute marketing tasks using the Skills library.
Maintain UTUBooking brand voice at all times.

### Workspace Layout
```
skills/           — all SKILL.md instruction files (auto-loaded)
marketing/        — campaigns, email drafts, social posts, SEO reports
  blog-drafts/    — sub-agent post output landing folder
  social/         — social media content drafts
  email/          — newsletter and campaign drafts
  seo/            — audits, reports, calendars
```

### Skills Available — Marketing
Load when task matches trigger. See `skills/README.md` for full list.

| Task | Load This Skill |
|---|---|
| Blog post / SEO article | `skills/seo-content-writer/SKILL.md` |
| LinkedIn post | `skills/marketing/linkedin-post-writer.md` |
| Email newsletter | `skills/marketing/email-newsletter-writer.md` |
| Email CTA | `skills/marketing/email-ctas.md` |
| Multi-channel repurpose | `skills/marketing/content-repurpose.md` |
| Reels / TikTok / Shorts | `skills/marketing/short-form-video-script.md` |
| Google / Meta ads | `skills/marketing/paid-ads.md` |
| SEO audit | `skills/seo-audit/SKILL.md` |
| Keyword research | `skills/keyword-research/SKILL.md` |
| Weekly SEO report | `skills/seo-command-center/SKILL.md` |
| Quality check | `skills/marketing/content-reviewer.md` |

### API Keys (v1.0 addition)
`APIs.env` at project root — contains `OPENROUTER_API_KEY` for Crosscheck + image generation.
Never commit this file (already in `.gitignore`).

### Standing Marketing Rules (v1.0 corrected)
- **Always** run `skills/anti-slop.md` before delivering any final content
- **Always** reference `skills/seo-content-writer/references/tone-of-voice.md` for voice
- **ZERO** em dashes (—) in any content — replace with comma, colon, or split sentence
- **ZERO** emojis in blog posts or marketing copy
- **ZERO** semicolons — split into two sentences
- No hashtags in LinkedIn posts
- Confirm before overwriting any existing file
- All content is draft only — NEVER publish without human approval
- Arabic content requires native Gulf Arabic speaker review before use
- Keep sub-agent instructions tight — load only what each agent needs
- Auto-Improve (`skills/auto-improve.md`) runs passively after every skill — do not invoke directly
- Crosscheck (`skills/crosscheck.md`) requires EXPLICIT user request before calling any external model

### Session Startup Checklist (Marketing Sessions)
1. Read this file and `marketing/CLAUDE.md`
2. Note current campaigns and priorities
3. Confirm what the user wants to accomplish today
4. Load relevant skill(s) for the task
5. At end of session: save all outputs to correct `marketing/` subfolder

### Sub-Agent Power Prompt
For parallel production (3+ blog posts, batch social, full campaigns):
See `marketing/workflows/ai-cmo-power-prompt.md`