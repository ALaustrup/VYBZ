# STATUS

> **Authority 4 of 5.** The single operational checkpoint. Every claim cites evidence.
> Update this at the end of any unit of work. If it is stale, it is wrong.

**Date:** 2026-08-07
**Branch:** `main`
**HEAD:** `101587b3273ab065088d787470ab016a98feeefd` — synced with `origin/main`
**Working tree:** clean
**Current milestone:** **M4 — Measurement Integrity Foundation.** Meter foundation (PR #63) and live scan progress meter (PR #64) are on `main` and deployed.

---

## Production

| Item | Value | Evidence |
|---|---|---|
| Alias | https://vybz.cloud | HTTP 200 (2026-08-07) |
| Production SHA | `101587b3273ab065088d787470ab016a98feeefd` | live JS contains full SHA |
| Deployed bundle | `/assets/index-Df6QMOxb.js` | live fetch 2026-08-07 |
| Deployment current with `main` | **YES** | live SHA = `main` HEAD |
| Scan progress in live bundle | **PASS** | `prepare-scan-progress` + “Measuring loudness and true peak” present |
| BS.1770 meter in live bundle | **PASS** | `m4.bs1770` present |

## Last completed operations

1. **PR [#64](https://github.com/ALaustrup/VYBZ/pull/64) merged** (`101587b3`) — live scan progress meter; analysis deferred into scanning stage.
2. **PR [#63](https://github.com/ALaustrup/VYBZ/pull/63) merged** (`7344cdd1`) — BS.1770-4 / true-peak foundation.
3. **Production deploy measured** — live bundle = `101587b3` with scan progress + BS.1770 markers (2026-08-07).
4. **Correctness gate on PR #64 branch** — lint PASS; test **321/321** (56 files); build PASS (2026-08-07).

## Gate on `main` @ `101587b3` — 2026-08-07

```
npm run lint / test / build — PASS on feat branch pre-merge (321 tests)
```

Delivery state: **DEPLOYED** — live SHA matches `main`. Signed-in Finalize scan smoke **NOT DONE** (requires owner session).

### M4 disclosures (Law 1)

| Claim | State | Evidence |
|---|---|---|
| Web/portable integrated LUFS | BS.1770-4 gated | stereo vector −22.993 LUFS @ −23 dBFS/ch |
| True peak (web/portable) | Measured 4× oversample | prior unit |
| Live scan progress | Determinate % from real stages | live `prepare-scan-progress` |
| Native Tauri analyze | Approx only | DesktopBatchPanel disclosure |

### Next authorised action

Owner signed-in smoke: Finalize → New scan → confirm live % / stage labels → findings show BS.1770 / true peak when measured.

## Working tree

On `main` @ `101587b3`. Unrelated WIP remains in stash. Do not drop without inspection.

## Historical notes

Prior Surface Overhaul / M3 / M2 evidence and parked decisions remain in git history for STATUS revisions before this checkpoint. Active blockers and known contradictions from the 2026-08-06 direction reset still apply where not closed by M4 PRs #63/#64.

### Direction (unchanged)

| Item | State |
|---|---|
| Authorised milestone | **M4 — Measurement Integrity Foundation** |
| Premium-suite phase track | **WITHDRAWN** |
| Law 3 during M4 | Social/live/messaging/rooms/connect: maintain only, no new feature work |
| DR-07 | In-repo BS.1770 under `packages/processing/waveform` — locked and implemented for web/portable |

## Active blockers (carry-forward)

| ID | Blocker | Blocks |
|---|---|---|
| - | Owner signed-in Finalize scan smoke on production after #64 deploy | Claiming scan meter DEPLOYED AND VERIFIED |
| - | Native desktop BS.1770 still pending | Cross-environment parity without disclosure |
| - | `20260805_0090_pro_hosting.sql` merged but not applied | Pro purchase path |
| DR-01…DR-05 | Scope decisions remain parked | Full scope lock |

## Next authorised action

1. **Owner:** signed-in Finalize scan smoke on https://vybz.cloud — New scan → live progress advances → BS.1770 / true peak on findings when measured.
2. Continue remaining M4 gaps (native BS.1770 parity or ongoing disclosure; tighter vector tolerances) only under owner direction.
