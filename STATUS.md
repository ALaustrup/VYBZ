# STATUS

> **Authority 4 of 5.** The single operational checkpoint. Every claim cites evidence.

**Date:** 2026-08-10
**Branch:** `main`
**HEAD:** `48b22593d3fde75fbbc97137db36b40c4ffd1f27`
**Current milestone:** **M9 — VDock Completion** deepen in progress

## Production

| Item | Value | Evidence |
|---|---|---|
| Alias | https://vybz.cloud | Vercel READY aliases |
| Production SHA | `48b22593` | `dpl_GsmpgxVYVhArYXKY7rm1stHnpmWr` READY |
| Latest feature merge on tip | [PR #121](https://github.com/ALaustrup/VYBZ/pull/121) STATUS after [PR #120](https://github.com/ALaustrup/VYBZ/pull/120) | MERGED |

## Last completed operations

1. Owner authorised next phase → **M9** in AGENTS.
2. M9.1 dry-playback contract (`m9.dry-playback.1`) + `PlaybackSignal`.
3. Dock disclosure chip (`data-vdock-disclosure`) for ambient/simulation.
4. Platform Bridge `playback.getCapabilities()` — dryHtmlAudio, nativeDsp false.
5. Executable `m9VdockGate.test.ts` (Law 5 / Masterplan M9).
6. Gate: lint / test **481** / build / check:no-fixtures PASS on `482e5a15`.
7. M9 MediaSession deepen shipped behind the Platform Bridge: OS
   play/pause/seek/previous/next controls route through the stable AudioBus controller;
   truthful catalog album metadata, playback state and bounded position state sync without
   adding DSP; runtime capability detection and cleanup cover web/WebView shells.
8. Translation Lab and Correct previews route locally through AudioBus/VDock; every
   processed or loudness-matched source carries `simulationSignal`, while dry originals
   carry `localSignal`. Each preview owns a one-track queue; page-owned blob URLs stop only
   their active preview before revoke. Matched A is named as a processed reference.
9. M7 actionable translation findings use only measured streaming-preview LUFS and gain,
   apply a versioned 1 dB VYBZ action threshold, reuse shipped Correct mappings, and deep-link
   to a preselected Correct operation. The M7 gate now enforces the findings-to-correction path.
10. Owner confirmed dating/swipe is **not** a parked roadmap item — it is a permanent ban
    (Law 3). STATUS wording updated so “parked” only means deferred authorised work.

## Deployment state

**DEPLOYED** — production READY @ `48b22593` via
`dpl_GsmpgxVYVhArYXKY7rm1stHnpmWr`.

## Production verification

Vercel READY. Interactive smoke: **Not measured** (auth-gated).

MediaSession lock-screen/OS control smoke: **Not measured** (requires a supported browser
or packaged WebView).

## Working tree

Clean `main` at `48b22593` before this STATUS sync.

## Latest verification

Prior gate evidence on M7 actionable findings (PR #120): lint / test **494** / build /
`check:no-fixtures` PASS. This commit is STATUS-only.

## Permanently out of scope (not parked)

Dating, romantic, love, meetup, and swipe-matching functionality — Law 3. Never a backlog
candidate. Do not list under parked.

## Blockers / parked

OR-021–022, OR-024–025, Instrument Creator, M10. Live/messaging feature growth still parked
beyond OR-031.

## Next authorised action

Continue M9 deepen + M8/OR polish without further prompts. Do not begin M10 until named.
