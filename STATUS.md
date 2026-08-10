# STATUS

> **Authority 4 of 5.** The single operational checkpoint. Every claim cites evidence.

**Date:** 2026-08-10
**Branch:** `feat/m9-native-audio-focus`
**HEAD:** *(feature tip)*
**Current milestone:** **M9 — VDock Completion** deepen in progress

## Production

| Item | Value | Evidence |
|---|---|---|
| Alias | https://vybz.cloud | Vercel READY aliases |
| Production SHA | `8e4f7554` (pre this PR) | prior READY |
| Prior feature | [PR #128](https://github.com/ALaustrup/VYBZ/pull/128) | MERGED |

## Last completed operations

13. Playback lifecycle (PR #128).
14. **M9 Android AudioManager focus authorised** — native `VybzAudioFocus` plugin +
    `bindAudioFocus` pauses dry AudioBus on loss/transient (no duck DSP); caps report
    `audioFocus` only when plugin available. Device call-interrupt smoke: **Not measured**.

## Deployment state

**IN PROGRESS** — feature branch.

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
Verify audio-focus interrupt on a physical Android device when available.
