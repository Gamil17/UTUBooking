# UTUBooking AI CMO — Session Handover Template
**Purpose:** Session continuity across Claude Code conversations
**How to use:** Paste the "Session Start" block at the beginning of each new session.
Update the "Session End" block before closing each session.

---

## SESSION START — Paste This at the Top of Every New Marketing Session

```
Read CLAUDE.md and marketing/CLAUDE.md before we begin.
Then read marketing/HANDOVER.md and tell me:
1. What was in progress last session?
2. What decisions were pending?
3. What files were last modified?
4. What should we tackle first today?

Current priorities from CLAUDE.md: [auto-read]
```

---

## LAST SESSION SUMMARY

**Date:** 2026-03-25
**Session focus:** Built v1.5.0 Marketing Skills Suite — 9 new marketing skills deployed

**What was completed:**
- anti-slop.md — quality filter for all content output
- skill-creator/SKILL.md — filled in from scaffold
- marketing/linkedin-post-writer.md
- marketing/email-newsletter-writer.md
- marketing/email-ctas.md
- marketing/content-repurpose.md
- marketing/short-form-video-script.md
- marketing/paid-ads.md
- marketing/content-reviewer.md
- marketing/youtube-seo-packaging.md
- social-post-kit.md — upgraded from stub to full skill
- marketing/CLAUDE.md — AI CMO briefing format prepended
- CLAUDE.md — AI CMO Mode section added
- marketing/workflows/ai-cmo-power-prompt.md — 5 power prompts
- marketing/workflows/sub-agents-guide.md — parallel production guide

**Decisions pending:**
- [ ] First blog post still not run (Stage 5 of SEO checklist)
- [ ] GA4 / GSC / DataForSEO MCPs still need manual credential setup
- [ ] Voice dictation (Super Whisper equivalent for Windows) not configured

**Files modified this session:**
- CLAUDE.md, marketing/CLAUDE.md, skills/README.md
- All files under skills/marketing/
- marketing/workflows/ (new folder)

**Next session priorities:**
1. Run Stage 5A blog post pipeline — first content run
2. Set up DataForSEO credentials in .env.mcp (quickest MCP win)
3. Test skill triggers: ask Claude "What skills do you have?" to verify all load

---

## SESSION END — Template (fill in before closing)

```
## LAST SESSION SUMMARY

**Date:** [YYYY-MM-DD]
**Session focus:** [1-sentence description]

**What was completed:**
- [item 1]
- [item 2]

**Decisions pending:**
- [ ] [pending decision 1]
- [ ] [pending decision 2]

**Files modified this session:**
- [file paths]

**Next session priorities:**
1. [highest priority]
2. [second priority]
3. [third priority]

**Active campaigns status:**
- [campaign name]: [current status]
```

---

## CAMPAIGN TRACKER

Update this section whenever a campaign changes status.

| Campaign | Market | Status | Next Action | Owner |
|---|---|---|---|---|
| Apr-Jun 2026 SEO calendar | Global | Briefs ready, no posts written | Run Stage 5A prompt | Claude + human review |
| Ramadan 2026 campaign | UK/US/KSA | Not started | Use Power Prompt 4 | TBD |
| Monthly audit workflow | All | Built, not activated | Configure GA4/GSC MCPs first | TBD |

---

## QUICK SKILL REFERENCE

Copy and paste these triggers to activate skills:

```
"Write a LinkedIn post about [topic]"          → linkedin-post-writer
"Write a newsletter about [topic]"              → email-newsletter-writer
"Write email CTA for [campaign]"               → email-ctas
"Repurpose this post for social and email"     → content-repurpose
"Write a Reel script about [topic]"            → short-form-video-script
"Write Google/Meta ads for [campaign]"         → paid-ads
"YouTube packaging for [video topic]"          → youtube-seo-packaging
"Review this content before publishing"        → content-reviewer
"Run anti-slop on this"                        → anti-slop
"Write a blog post about [topic]"              → seo-content-writer
"Audit [URL] for SEO"                          → seo-audit
"SEO report for UTUBooking"                    → seo-command-center
"Keyword research for [topic]"                 → keyword-research
"Create a new skill for [task]"                → skill-creator
```
