---
name: anti-slop
description: Scans any content for AI-generated filler language and rewrites
  flagged sections. Use after generating any blog post, email, social post,
  or ad copy for UTUBooking. Flags 40+ known AI phrases, em dashes, and
  UTUBooking-specific banned terms. Applies tone-of-voice.md rules.
---

# Anti-Slop Filter

Scan the provided content. Flag every instance of AI-generated filler.
Rewrite each flagged section without losing meaning.
Reference: skills/seo-content-writer/references/tone-of-voice.md

## Tier 1 — Always Flag & Rewrite

delve, leverage, synergy, game-changer, landscape, paradigm shift,
robust, innovative, comprehensive, streamline, cutting-edge, state-of-the-art,
holistic, impactful, actionable insights, move the needle, circle back,
at the end of the day, it goes without saying, needless to say,
it is important to note, in today's digital age, in conclusion,
utilize (→ use), commence (→ start), facilitate, endeavour,
seamless, hassle-free, world-class, best-in-class, transformative

## Tier 2 — UTUBooking-Specific Bans

tourist (when referring to Makkah/Madinah visitors — use 'pilgrim' or 'traveler')
guaranteed results / guarantee rankings (legal risk)
cheapest (→ most affordable / best value)
Any competitor name in negative context (Wego, Almosafer, Booking.com, Agoda)
"book your dream Umrah" (cliché — be specific instead)
"spiritual journey of a lifetime" (overused — describe the actual benefit)

## Tier 3 — Flag & Review (context-dependent)

absolutely, certainly, of course, as we know,
I hope this email finds you well, I wanted to reach out,
touch base, bandwidth, deep dive

## Structural Issues to Fix

- Em dashes (—): replace with comma, colon, or split the sentence
- Sentences over 25 words: split them
- Three or more consecutive sentences starting with 'The'
- Paragraphs over 4 sentences in social/email content
- Passive voice: rewrite as active ('Hotels are filtered by...' → 'Filter hotels by...')

## Output Format

1. List flagged instances with original text quoted
2. Show rewrite for each
3. Deliver clean final version
4. Summary line: "[X] instances flagged, [X] rewritten"
