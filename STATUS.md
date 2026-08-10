# STATUS

> **Authority 4 of 5.** The single operational checkpoint. Every claim cites evidence.

**Date:** 2026-08-10
**Branch:** `main`
**HEAD:** `493c1e17`
**Current milestone:** **M9 — VDock Completion** **CLOSED** as Masterplan §12
**DEPLOYED BUT UNVERIFIED**. No new Masterplan milestone named — carry-forward
**M7 / M8 / OR** polish. Do not begin **M10** until owner-authorised.

## Production

| Item | Value | Evidence |
|---|---|---|
| Alias | https://vybz.cloud | Vercel READY aliases |
| Production SHA | `493c1e17` | Vercel Production deploy id `5837426157` READY (dashboard `GzLDbcmLapvv78AatNFtHGxTHxQo`); close-out merge `643d7089` / `5837352044` |
| Close-out PR | [PR #136](https://github.com/ALaustrup/VYBZ/pull/136) | MERGED 2026-08-10 |
| Tip sync PR | [PR #137](https://github.com/ALaustrup/VYBZ/pull/137) | MERGED 2026-08-10 |

## Last completed operations

15. VDock compare helper + MasterReady matched A/B (PR #132).
16. M9 Analyzer loudness-matched Before/After (PR #134) @ `c795a83d`.
17. STATUS tip sync PR #135 @ `d1fdaded`.
18. **M9 close-out** — PR #136 @ `643d7089`: executable `m9VdockGate` exit gate;
    AGENTS/STATUS/IDEAS mark M9 **DEPLOYED BUT UNVERIFIED**; stable interfaces frozen
    (`m9.dry-playback.1`, `m9.compare-preview.1`). Tip sync PR #137 @ `493c1e17`.

## M9 close-out evidence (code)

| Surface | Evidence |
|---|---|
| Dry AudioBus + `PlaybackSignal` | `m9.dry-playback.1`; `audioBus.ts` no live DSP graph |
| Dock disclosure | `data-vdock-disclosure` compact + expanded |
| Bridge playback APIs | `getCapabilities`, `bindMediaSession`, `bindPlaybackLifecycle`, `bindAudioFocus` |
| Compare preview | `m9.compare-preview.1` MasterReady + Analyzer |
| Android AudioManager | `VybzAudioFocusPlugin` registered |
| Executable gate | `src/features/prepare/m9VdockGate.test.ts` |

## Deployment state

**DEPLOYED BUT UNVERIFIED** (Masterplan §12) — production READY @ `493c1e17`
(close-out content @ `643d7089`). Interactive / device interrupt smoke remain
**Not measured**.

## Production verification

| Check | Result |
|---|---|
| Vercel READY (close-out) | PASS @ `643d7089` / deploy `5837352044` |
| Vercel READY (STATUS tip) | PASS @ `493c1e17` / deploy `5837426157` |
| Interactive VDock smoke | **Not measured** |
| MediaSession OS controls smoke | **Not measured** |
| Android call-interrupt audio focus | **Not measured** |
| iOS AVAudioSession focus | Parked — **Not measured** |

## Latest verification

Close-out PR #136 (pre-merge on `docs/m9-closeout`):

- `npm run lint` — PASS.
- `npm run test` — PASS, **504 tests**.
- `npm run build` — PASS.
- `npm run check:no-fixtures` — PASS.

## Permanently out of scope (not parked)

Dating / swipe — Law 3.

## Blockers / parked

OR-021–022, OR-024–025, Instrument Creator, **M10** (until named). iOS AVAudioSession
focus residual.

## Next authorised action

Continue **M7 / M8 / OR** carry-forward. Do not begin **M10** until named.
Owner may later evidence device smokes to promote M9 toward production-verified.
