# STATE

The current checkpoint. Every claim cites evidence. Replaces the former `STATUS.md`.

**Date:** 2026-08-15
**Branch:** `main` @ `d631ae2b`. Zero open pull requests.
**Production:** https://vybz.cloud — HTTP 200 measured 2026-08-15 before these merges. The
deployed SHA after them is **Not measured**.

## What just changed

**Documentation rebuilt from zero** — PR #178, merged @ `18a458ce`. No application behaviour
changed; `src/product/invariants.ts` has zero runtime imports and its identifiers are absent
from `dist/`, verified after build.

**Living Mix** — PR #177, merged @ `d631ae2b`. Rebased onto the rebuilt docs, dropping its edits
to the deleted `IDEAS_BACKLOG.md` and `STATUS.md` and to the rewritten `AGENTS.md`. Code
unchanged; its gate now asserts membership in `GATE_REGISTRY`.

| Action | Detail |
|---|---|
| Added | `PRODUCT.md` — the single authority (The Station) |
| Added | `src/product/invariants.ts` — every enforceable rule, in code |
| Added | `docs/decisions/0001-the-station.md` — the decision and what it rejected |
| Added | `STATE.md` — this file |
| Rewrote | `AGENTS.md` — operations only, no milestone tracking |
| Rewrote | 16 gate tests to import invariants instead of grepping markdown |
| Deleted | `VYBZ_MASTERPLAN.md`, `STATUS.md`, `IDEAS_BACKLOG.md`, `ARCHITECTURE.md` |

Deleted documents remain in git history. **No feature code was removed.**

## Validation on this branch

| Command | Result |
|---|---|
| `npm run lint` | pass — `tsc --noEmit` exit 0 |
| `npm run test` | pass — **141 files / 629 tests** |
| `npm run build` | pass — vite production build |
| `npm run check:no-fixtures` | pass — 13 markers absent from `dist/` |
| `npm run test:e2e` | Not measured |

Measured on `feat/living-mix` immediately before it merged. The docs-only branch measured 138
files / 615 tests before Living Mix's three test files were reapplied.

## The Station — build state

**Nothing of The Station is built yet.** What landed is documentation, rule plumbing, and the
Living Mix on-demand surface that predates the decision.

| Piece | State |
|---|---|
| One synchronized station | **PARTIALLY IMPLEMENTED** — `vibes_radio_broadcast/_queue/_pool`, `vibes-radio` edge, skew-corrected clock all exist from OR-043 |
| Block programming | Not started |
| Sparks (prompt mechanic) | Not started |
| Airtime balance and ledger | Not started — `vc_ledger` exists for V¢ only |
| Per-answer charging | Not started |
| Locked-transport playback | Not started |
| The Last Hour replay page | Not started |
| Artist reception view | Not started |
| New mobile-first landing | Not started |
| Hiding non-Station surfaces from default navigation | Not started |

Living Mix (`/library/mix`) shipped as the personal on-demand listening mode described in
`PRODUCT.md` §6. It is deliberately **not** reward-bearing.

## What already exists and must not be deleted

Measured 2026-08-15: **714 TypeScript files, 77,321 lines** across `src` and `packages`,
**111 migrations**, **30 edge functions**.

Notable assets The Station will build on: in-browser BS.1770-4 loudness measurement validated
to ±0.5 LU on a −23 LUFS sine; nine reversible correction operations; `audio-play` as the
playback ticket authority; content-addressed `repo_*` version-control schema (unused); forensic
watermark plus detector and a `provenance_ledger`; a machine-readable app manifest served over
authenticated HTTPS; the Perception Engine; DAW folder detection; WebGL reactive visual engines.

Full inventory is in [`docs/architecture.md`](./docs/architecture.md).

## Known issues carried forward

**Private playback is partially migrated.** `can_user_play_path` and the `audio-play` check
landed in PR #173, but the client still prefers `createSignedUrls` in places, storage read is
not owner-locked, and `assets.url` is still exposed to non-viewers. Steps 2–4 of that sequence
remain open. This matters more now: **locked-transport, verified listening is the foundation of
Airtime**, so playback authority must be finished before the economy can be trusted.

**Migration `20260811_0094_dm_thread_last_at`** was merged but, as last recorded, not applied.
Not re-measured this turn.

**Stripe payouts disabled** — `payouts_enabled: false`, `business_profile.url` points at a
domain that does not resolve. Dashboard-only fix. Not re-measured this turn.

**No signed-in production verification has ever been recorded.** No test account is available,
so every member-only flow on `vybz.cloud` is `Not measured`.

## Next

1. Owner reviews this branch.
2. Finish playback authority (steps 2–4) — Airtime depends on it.
3. Design and build the mobile-first Station interface.
4. Hide non-Station surfaces from default navigation without deleting them.
