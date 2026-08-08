# STATUS

> **Authority 4 of 5.** The single operational checkpoint. Every claim cites evidence.
> Update this at the end of any unit of work. If it is stale, it is wrong.

**Date:** 2026-08-08
**Branch:** `main`
**HEAD:** `a14a74fd` (merge PR #84 channel balance)
**Working tree:** clean after STATUS checkpoint
**Current milestone:** **M6** (DC + peak-safety + channel balance).

---

## Production

| Item | Value | Evidence |
|---|---|---|
| Alias | https://vybz.cloud | live |
| Production SHA | `a14a74fd` | Vercel SUCCESS |
| Bundle | `index-D8zWhAX9.js` | contains `correct-op-balance`, `m6.channel-balance` |

## Last completed operations

| PR | Unit | State |
|---|---|---|
| [#82](https://github.com/ALaustrup/VYBZ/pull/82) | M6 peak-safety | **DEPLOYED AND VERIFIED** |
| [#84](https://github.com/ALaustrup/VYBZ/pull/84) | M6 channel balance | **DEPLOYED AND VERIFIED** |

## Gate

```
npm run lint / test / build — PASS (394 tests on feature tip)
```

Delivery state: **DEPLOYED AND VERIFIED**.

## Direction

| Item | State |
|---|---|
| Authorised milestone | **M6** + M5 depth as needed |
| Premium-suite phase track | **WITHDRAWN** |
| Next authorised action | Owner-directed: chain ops / fade silence / M5 broadband noise / OR-013 |

## Blockers

None.

## Known contradictions

Native desktop BS.1770 remains approx-pending (M4 carry-forward). Peak safety is sample-peak only — not true-peak/ISP.
