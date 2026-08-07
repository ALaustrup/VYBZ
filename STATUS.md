# STATUS

> **Authority 4 of 5.** The single operational checkpoint. Every claim cites evidence.
> Update this at the end of any unit of work. If it is stale, it is wrong.

**Date:** 2026-08-07
**Branch:** `feat/m4-exit-gate-native-disclosure`
**HEAD:** pending commit — based on `main` @ `8a4dffbe`
**Working tree:** dirty until commit
**Current milestone:** **M4 — Measurement Integrity Foundation.** Owner confirmed production Finalize scan (**DEPLOYED AND VERIFIED**). Follow-up: executable exit gate + native disclosure harden.

---

## Production

| Item | Value | Evidence |
|---|---|---|
| Alias | https://vybz.cloud | HTTP 200 (2026-08-07) |
| Production SHA | `101587b3273ab065088d787470ab016a98feeefd` | live JS measured 2026-08-07 |
| Deployed bundle | `/assets/index-Df6QMOxb.js` | live fetch 2026-08-07 |
| Deployment current with app tip | **YES** | live SHA = PR #64 merge |
| Scan progress in live bundle | **PASS** | `prepare-scan-progress` + measuring stage label |
| BS.1770 meter in live bundle | **PASS** | `m4.bs1770` present |
| Owner signed-in smoke | **PASS** | Owner confirmed 2026-08-07 ("confirmed all") |

## Last completed operations

1. **Owner confirmation** — Finalize scan + M4 production behaviour accepted (2026-08-07).
2. **PR [#64](https://github.com/ALaustrup/VYBZ/pull/64) merged** (`101587b3`) — live scan progress meter.
3. **PR [#63](https://github.com/ALaustrup/VYBZ/pull/63) merged** (`7344cdd1`) — BS.1770-4 / true-peak foundation.
4. **Production deploy measured** — live bundle = `101587b3` with scan progress + BS.1770 markers.

## Gate on `main` @ `101587b3` / STATUS `8a4dffbe` — 2026-08-07

```
npm run lint / test / build — PASS on feat branches pre-merge (321 tests on #64)
```

Delivery state: **DEPLOYED AND VERIFIED** — live SHA matches merge tip; owner confirmed signed-in Finalize scan behaviour.

### M4 disclosures (Law 1)

| Claim | State | Evidence |
|---|---|---|
| Web/portable integrated LUFS | BS.1770-4 gated | stereo vector −22.993 LUFS @ −23 dBFS/ch |
| True peak (web/portable) | Measured 4× oversample | prior unit + production findings path |
| Live scan progress | Determinate % from real stages | live + owner confirm |
| Native Tauri analyze | Approx only (disclosed) | DesktopBatchPanel / `native.approx` — M4 gate allows disclosed difference |

### Next authorised action

Land PR for executable M4 gate (`m4MeasurementGate.test.ts`) + native `native.approx.1` disclosure. Then owner authorises M4 exit / M5 start (do not begin M5 silently).

## Working tree

On `main`. Unrelated WIP remains in stash. Do not drop without inspection.

## Direction

| Item | State |
|---|---|
| Authorised milestone | **M4 — Measurement Integrity Foundation** (exit in progress) |
| Premium-suite phase track | **WITHDRAWN** |
| Law 3 during M4 | Social/live/messaging/rooms/connect: maintain only |
| DR-07 | In-repo BS.1770 under `packages/processing/waveform` — web/portable shipped |

## Active blockers (carry-forward)

| ID | Blocker | Blocks |
|---|---|---|
| - | Native desktop BS.1770 parity | Claiming identical meters on Rust without disclosure |
| - | `20260805_0090_pro_hosting.sql` merged but not applied | Pro purchase path |
| DR-01…DR-05 | Scope decisions remain parked | Full scope lock |

## Next authorised action

1. Land executable M4 gate + native disclosure hardening.
2. Owner: authorise M4 exit and M5 start when ready (do not begin M5 silently).
