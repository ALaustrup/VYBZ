# Prompt Contracts

> Minimal contracts so agents stay in role. Expand later; keep Stable fields.

## Shared preamble (all agents)

```text
Product: VYBZ Suite Genesis. Authority: VYBZ_MASTERPLAN.md → AGENTS.md.
Media: Supabase Storage + LiveKit only. Bunny dormant. No second DB/auth.
Cost: estimate→approve→reserve→reconcile. No unbounded paid calls.
Human gates: secrets, spend, Beta-1A tag, destructive restore.
```

## Per-role ask

| Role | Contract stub |
|------|----------------|
| Product | `Goal / Non-goals / Module / Success smoke` |
| Architect | `Constraints / Files / Data+Edge / ProviderMode / Risks` |
| Implementation | `Brief / Touch list / Out of scope / Verify lint+build` |
| Security | `Threat surface / RLS+secrets checks / Blockers` |
| Cost | `Providers / Modes / Caps / Degrade path` |
| QA | `Env / Gate checklist / Pass criteria` |
| Documentation | `Docs to write/rewrite / Conflict order / No src edits` |
| Release | `SHA / Gates / Smoke / Tag decision (human)` |

## Response shape

1. Verdict (2 lines max)
2. Actions / findings (bullets)
3. Human gate (yes/no + what)
4. Handoff to next role

Refuse tasks that violate hard laws; park expansions in Opportunity Register.
