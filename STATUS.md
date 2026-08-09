# STATUS

> **Authority 4 of 5.** The single operational checkpoint. Every claim cites evidence.
> Update it at the end of any unit of work. If it is stale, it is wrong.

**Date:** 2026-08-09
**Branch:** `feat/landing-invite-key-gate`
**HEAD:** (tip after commit)
**Working tree:** clean after commit
**Current milestone:** **M6** - landing alpha gate then Correct deepen

---

## Production

| Item | Value | Evidence |
|---|---|---|
| Alias | https://vybz.cloud | live |
| Production SHA | `5adba9ee` | Merge PR #105 (app-bar wordmark) at branch start |
| Agent API | `GET /api/ai-review/manifest` | Bearer `AI_REVIEW_AGENT_TOKEN` |

## Last completed operations

| Unit | State |
|---|---|
| PR #105 app-bar wordmark + MobileNav freeze | **MERGED** (`5adba9ee`) - Vercel deploy not re-verified in this unit |
| Landing invite-key gate (strip manifesto) | **CODED · LOCAL VALIDATED** - this branch |

## This unit (landing gate)

| Change | Detail |
|---|---|
| Landing | Logo + hue/hover mark; key field; pulsing neon Enter + Sign in ghost |
| Flow | Key stashed in sessionStorage -> `/enter` -> auto-redeem on InviteRedeemPage |
| Removed | Headline, steps, free-scan CTAs from signed-out landing |
| Kept | Privacy / Terms footer; Codex link on redeem |

## Gate (local)

```
npm run lint - PASS
npm run test - 436 passed
npm run build - PASS
npm run check:no-fixtures - OK
```

## Direction

| Item | State |
|---|---|
| Next | Push/PR/merge landing gate; then M6 Correct deepen (OR-026 hum still needs authorisation) |
| Parked | OR-020-022, OR-024-026; auth AI-review walk; Instrument Creator |
| Stash | `stash@{0}` still present - not dropped |

## Blockers

None for local validation.

## Known contradictions

Native desktop BS.1770 remains approx-pending (M4 carry-forward). Peak safety sample-peak only. Leveling RMS proxy toward -14, not full BS.1770 gain-to-target.