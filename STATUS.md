# STATUS

> **Authority 4 of 5.** The single operational checkpoint. Every claim cites evidence.

**Date:** 2026-08-10
**Branch:** `main`
**HEAD:** `9a45cfd1`
**Current milestone:** **M9 — VDock Completion** deepen in progress

## Production

| Item | Value | Evidence |
|---|---|---|
| Alias | https://vybz.cloud | Vercel READY aliases |
| Production SHA | `9a45cfd1` | `dpl_DyQJsaAq22oQQhTmE6FsQyXqfN9w` READY |
| Feature PR | [PR #130](https://github.com/ALaustrup/VYBZ/pull/130) | MERGED |

## Last completed operations

13. Playback lifecycle (PR #128).
14. **M9 Android AudioManager focus** — native `VybzAudioFocus` + `bindAudioFocus`;
    pause on loss/transient (no duck DSP). Merged PR #130. Web deploy carries the bridge
    TS; native plugin ships with the Android Capacitor app build.

## Deployment state

**DEPLOYED** — production READY @ `9a45cfd1` via
`dpl_DyQJsaAq22oQQhTmE6FsQyXqfN9w` (web). Android AAB with `VybzAudioFocusPlugin`:
not rebuilt in this unit (code on main).

## Production verification

Vercel READY. Interactive smoke: **Not measured**.
Android call/notification audio-focus interrupt: **Not measured** (requires device + native build).

## Latest verification

- `npm run lint` — PASS.
- `npm run test` — PASS, **499 tests**.
- `npm run build` — PASS.
- `npm run check:no-fixtures` — PASS.

## Permanently out of scope (not parked)

Dating / swipe — Law 3.

## Blockers / parked

OR-021–022, OR-024–025, Instrument Creator, M10. iOS AVAudioSession focus not in this wedge.

## Next authorised action

Remaining M9 polish or M8/OR carry-forward. Do not begin M10 until named.
Verify audio-focus interrupt on a physical Android build when available.
