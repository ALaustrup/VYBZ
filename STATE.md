# STATE

The current checkpoint. Every claim cites evidence. Replaces the former `STATUS.md`.

**Date:** 2026-08-15
**Branch:** `feat/self-serve-alpha-keys` (from `main` @ `18196050`)
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
| `npm run test` | pass — **143 files / 647 tests** |
| `npm run build` | pass — vite production build |
| `npm run check:no-fixtures` | pass — 13 markers absent from `dist/` |
| `npm run test:e2e` | Not measured |

Measured on `feat/self-serve-alpha-keys`. Growth from 635 is `alphaKeyGate` plus the expanded
`alphaWelcomeGate`.

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

## Playback authority — private-by-default sequence

Airtime depends on verified listening, so this must be finished before the economy means
anything.

| Step | What | State |
|---|---|---|
| 1 | `audio-play` checks `can_user_play_path`, fails closed | **Done** — PR #173, deployed as edge v7 |
| 2 | Client routes **all** playback through tickets | **IMPLEMENTED BUT NOT DELIVERED** — this branch |
| 3 | Lock `audio-assets` storage read to the owner folder | **APPLIED AND VERIFIED** 2026-08-15 |
| 4 | Stop exposing `assets.url` to non-viewers | Designed, not built |

**Step 2** removed the `createSignedUrls` bypass from `signAudio`. The client could previously
sign any object in the bucket with the anon key, which skipped the visibility check entirely.
Ticket minting is now batched at 50 paths per request with batches issued in parallel.

**Step 3 is applied.** The live policy is now:

```
audio-assets read · SELECT · {authenticated}
using ((bucket_id = 'audio-assets') AND ((storage.foldername(name))[1] = (auth.uid())::text))
```

It replaced an open `using (bucket_id = 'audio-assets')` that let any signed-in user read any
object in the bucket. Reversible via the paired `.down.sql`.

### Signed-in production verification — 2026-08-15

**The first signed-in verification recorded for this project.** Performed as
`ai-reviewer-20260809@vybz.demo` (member, not admin) against production.

| Check | Result |
|---|---|
| Password sign-in | HTTP 200, access token issued |
| Mint tickets for two non-owned public paths | 2 of 2 minted, 0 denied, `backend=supabase-stream` |
| Stream a non-owned track | 302 → **206 Partial Content**, `audio/mpeg`, `bytes 0-4095/12389004` |
| Payload is real audio | first bytes `49 44 33` (ID3) |
| Same playback **after** the storage lock | 302 → **206**, unaffected |
| Client signing a non-owned object directly | **HTTP 400 — blocked** |

Service-role callers (`audio-play`, `watermark`) bypass RLS by design, which is why playback
and downloads are unaffected.

**Still Not measured:** the browser UI signed in on vybz.cloud (library at scale, chat
identity, DM ordering). Only the audio path was exercised.

**Step 4** requires the client to request tickets by **asset id** rather than by storage path,
so `assets.url` never needs to leave the server. That is a contract change to `audio-play` and
has not been started.

**Edge drift:** `supabase/functions/audio-play/index.ts` in the repo now evaluates visibility
concurrently instead of once per path. **Not deployed** — production still runs v7, which is
functionally correct but serial. The client works against either; deploying only improves
latency on large feeds.

## Alpha access — self-serve keys

The gate is now **email-tagged, not invite-only**: anyone can generate a key. That is a
deliberate product change. What the email buys is attribution and a throttle, not exclusivity,
and the UI says so rather than implying a verification we do not perform.

| Piece | State |
|---|---|
| Migration `0097` | **APPLIED** to `xixmneooyufbeftdfpcm` — additive; `.down.sql` written |
| `alpha-key` edge function | **DEPLOYED** — version 1, ACTIVE, `verify_jwt: false` |
| Generator UI on landing + invite gate | On this branch |

Measured against production on 2026-08-15:

- Issuing a key returns a code; an invalid address is refused.
- Three keys per address in 24h succeed, the fourth returns `rate_limited_email`.
- Re-issuing revokes the previous unredeemed key — after three issues, **one** was live.
- Live endpoint with no session: `POST /functions/v1/alpha-key` → **200** with a key;
  invalid email → **400**.
- All smoke rows removed afterwards; zero self-issued keys remain.

Throttling lives in `issue_self_alpha_key`, which is revoked from `anon` and `authenticated`
and granted only to `service_role`, so it cannot be reached around the edge function. IPs are
salted and hashed before storage.

Email delivery is best-effort by design — the key is shown on screen, so a Resend failure
never costs a visitor their access. **Email delivery itself is Not measured.**

## Onboarding — the artist name

Choosing a name moved out of the full-page `UsernameSetup` blocker and into **step 2 of the
welcome tour**, immediately after the welcome. Later steps address the creator by that name.

The step cannot be skipped: the tour re-opens whenever the name is missing regardless of the
local completion flag, Skip and Next are withheld on that step, and `finish()` refuses to close
over a missing name. `UsernameSetup` stays in the tree, imported by nothing.

## Known issues carried forward

**Migration `20260811_0094_dm_thread_last_at`** was merged but, as last recorded, not applied.
Not re-measured this turn.

**Stripe payouts disabled** — `payouts_enabled: false`, `business_profile.url` points at a
domain that does not resolve. Dashboard-only fix. Not re-measured this turn.

**Agent verification account.** `ai-reviewer-20260809@vybz.demo` (username `aireviewer`,
member, not admin, alpha access, zero drops) exists for signed-in checks. Its password was
reset on 2026-08-15 so playback could be verified. The owner's account was deliberately not
touched: it is the platform's **only** admin, and adding a shared credential to it would have
weakened the single most privileged login on the platform.

Revoke it whenever, with `update public.profiles set banned = true where username =
'aireviewer';` — its own display name records that convention.

## Next

1. Deploy the updated `audio-play` edge to remove the serial visibility check (repo is ahead of
   the deployed v7; functionally equivalent, only latency differs).
2. Build step 4 — tickets by asset id, so `assets.url` stops leaving the server.
3. Design and build the mobile-first Station interface.
4. Hide non-Station surfaces from default navigation without deleting them.
