---
name: auto-improve
description: Passive self-patching system. Silently evaluates output after every
  skill execution, logs failures, and patches skill files when 3+ similar failures
  accumulate. Do not invoke directly. Runs automatically after every skill completes.
user-invocable: false
disable-model-invocation: true
---

# Auto-Improve — Passive Behavior Directive

This is NOT a skill you run. It is a behavior directive Claude follows automatically
after executing ANY skill. No dashboard. No test runs. Real usage IS the test suite.

---

## The 4-Step Loop (runs silently after every skill execution)

### Step 1 — Silent Eval
After delivering output: re-read the skill rules, check output compliance, check user
acceptance. This evaluation is internal — never shown to the user.

### Step 2 — Log the Failure
If output violated a skill rule OR the user corrected the output:
Write ONE line to `[skill-folder]/improvements.log`:

```
YYYY-MM-DD | [failure type] | [what failed] | [skill rule vs what happened]
```

### Step 3 — Check Fix Threshold
Scan `improvements.log`. Count similar failures.
**Threshold: 3+ similar failures.** Below 3 — stop, wait for more data.

### Step 4 — Patch the Skill
ONE targeted change only. Then:
1. Log the fix in `improvements.log` (mark resolved entries)
2. Tell the user in ONE line what changed, then move on immediately

---

## What Counts as a Failure

- **Rule violation** — output breaks an explicit instruction in the skill
- **User correction** — user says 'redo this', 'that's wrong', 'change X to Y'
- **User edit-after-delivery** — user accepts output then immediately asks for changes the skill should have handled
- **Repeated manual instruction** — user gives the same guidance the skill doesn't encode (e.g., keeps saying 'make it shorter')

## What is NOT a Failure

- User changes their mind about the brief (scope change, not a skill failure)
- Output is correct but user wants a different creative direction
- One-off edge cases that won't recur

---

## Log File Format

```
# [skill-folder]/improvements.log

2026-03-17 | rule violation | output used 'delve' | anti-slop list prohibits 'delve' but appeared in paragraph 3
2026-03-17 | user correction | user said 'too long' | skill says 1,000-1,200 words, output was 1,847 words
2026-03-18 | repeated instruction | user said 'add more line breaks' | skill has no rule about line break frequency

--- FIX APPLIED 2026-03-19 ---
Problem: Output consistently exceeded word limit
Change: Added explicit 'STOP WRITING at 1,200 words' to Word Count section
Location: Word Count Rules section
---
```

---

## Patch Rules — ONE Change Per Fix

| Allowed | Not Allowed |
|---|---|
| Add one specific instruction | Rewrite the skill |
| Tighten one vague rule | Make multiple changes in one patch |
| Add one anti-pattern example | Restructure the skill |
| Move one buried instruction higher | Change rules that are working |

---

## When NOT to Auto-Fix

- Failure is ambiguous — wait for more data
- Fix would contradict another rule in the skill — flag to user instead
- Skill is working well overall — 1-2 failures across dozens of runs is noise
- Fix would push SKILL.md past 500 lines — tighten existing rules instead of adding

---

## Telling the User

After patching, say exactly ONE line:
`"Updated [skill name]: added rule to [what changed]. Continuing."`

Then immediately continue with the session. Do not discuss the patch further unless asked.
