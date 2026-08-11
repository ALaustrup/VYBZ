# STATUS

> **Authority 4 of 5.** The single operational checkpoint. Every claim cites evidence.

**Date:** 2026-08-11
**Branch:** `feat/social-first-shell`
**HEAD:** see branch tip
**Current milestone:** **Social-first platform** — authorised by the owner 2026-08-11,
superseding Suite UX. VYBZ is a social network for music, sound and audio creators; the
production tools are additive and live behind the Tools launcher. Complete redesign of any
tool is authorised; **nothing may be removed**, only redesigned or frozen in the tree.

## Social-first sequence (authorised direction, not yet built)

| # | Slice | State |
|---|---|---|
| 1 | Tools behind one launcher; rail frozen in tree | **This branch** |
| 2 | Signed-in home = creator profile (already `/` → `ProfilePage`) restructured around identity | Not started |
| 3 | Library on the profile; adding audio publishes to the creator's feed | Not started |
| 4 | Feed as a first-class surface (currently `/feed`, absent from primary nav) | Not started |
| 5 | Follow model — today the profile action creates a mutual pending `connections` row, not a follow | Not started |
| 6 | Messaging surfaced properly (DMs already work end to end) | Not started |

## Open pull requests

| PR | Branch | What |
|---|---|---|
| #166 | `feat/prelogin-featured-helix` | Pre-login featured Helix player; `audio-play` v7 deployed |
| #167 | `feat/library-completeness` | Library pages the whole catalogue instead of capping at 80 |
| #168 | `fix/connect-request-honesty` | Connect no longer claims a pending request is a follow |

## Known issue — private drops are not private

Measured 2026-08-11 against `xixmneooyufbeftdfpcm`:

- `drops` SELECT is correctly gated by `can_view_drop(author_id, audience, id)`.
- `assets` SELECT is `(kind = ANY (...'track'...)) OR owner_id = auth.uid()` — the asset row,
 including its storage `url`, is readable by **anyone**, with no reference to drop audience.
- Storage `audio-assets read` is `(bucket_id = 'audio-assets')` for `authenticated` — **no**
 owner-folder restriction, so any signed-in user can sign any object.

Net: if a creator marks a drop `private` or `followers`, the drop row hides but the audio
stays reachable. **Currently unexploited** — a service-role query returned zero non-public
drops — but it must be closed before private or unreleased work is promoted. Fix needs a
migration (owner authorisation required); the stale comment at `src/lib/api.ts` claiming
`folder = auth.uid()` RLS should be corrected at the same time.

## Production

| Item | Value | Evidence |
|---|---|---|
| Alias | https://vybz.cloud | Live |
| Production SHA | `b2572975` (docs) on tip; Suite UX feature `b0d1645d` included | Landing footer **Build b257297**; Vercel status success for `b0d1645d` |

## Last completed operations

46. **OR-042 Analyzer reliability** — PR #162 @ `373746af`. Creative OS OR-032–042 closed.
47. **Suite UX authorised** then implemented.
48. **Suite UX merged** — PR #163 @ `b0d1645d`.
49. **Suite UX production verify (unsigned)** — 2026-08-11 on https://vybz.cloud.

## Deployment state

Suite UX **DEPLOYED AND VERIFIED** (unsigned surfaces) on https://vybz.cloud @ tip `b2572975` (includes `b0d1645d`).

## Production verification

Measured on https://vybz.cloud (unsigned):

| Check | Result | Evidence |
|---|---|---|
| Deploy tip | Build `b257297` | Landing footer / CDP `Build b257297` |
| Vercel Suite UX deploy | success | GH status on `b0d1645d` |
| `/settings/costs` | redirects to `/`; no Cost Sentinel | CDP `href=https://vybz.cloud/`, `hasCost=false` |
| `/settings/credits` | redirects to `/store` | Browser URL `https://vybz.cloud/store` |
| Prod JS | no Cost Sentinel / AI minutes pages; no prepaid mastering strings | `index-BsoGi6kG.js`: `CostSentinelDashboardPage`/`AiCreditsPage`/`getAiCreditBalance`/`debitAICredits`/`master-low-balance` = false; `profile-stage`/`artist-cover` = true |
| Prod CSS | wider stage + hidden scrollbars | `index-DvnfiB0y.css`: `max-w-6xl` + `scrollbar-width` present |

**Not measured (auth required):** signed-in Settings sheet, Store pack checkout UI, Mastering run, equipped accent wash, live artist cover image.

## Validation (pre-merge tip `989a92cb`, local)

| Command | Result | Evidence |
|---|---|---|
| `npm run lint` | pass | `tsc --noEmit` exit 0 |
| `npm run test` | pass | 133 files / 597 tests |
| `npm run build` | pass | vite production build |
| `npm run check:no-fixtures` | pass | 13 markers absent from `dist/` |
| `npm run test:e2e` | pass | 65/65 Playwright |

## Permanently out of scope (not parked)

Dating / swipe — Law 3. No DSP-delivery claims.

## Blockers / parked

OR-044 Drive sync parked. VYBZ Pro / DR-01 Live / DR-03 Opportunities **withdrawn** from active leftover.

## Next authorised action

Owner: optional signed-in smoke (Settings / Store / Master / profile cosmetics). Otherwise authorise the next wedge or park Suite UX deepen.
