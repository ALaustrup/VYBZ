# STATUS

> **Authority 4 of 5.** The single operational checkpoint. Every claim cites evidence.
> Update this at the end of any unit of work. If it is stale, it is wrong.

**Date:** 2026-08-08
**Branch:** `main`
**HEAD:** `9bba4d29` (merge PR #82 peak safety)
**Working tree:** clean after STATUS checkpoint
**Current milestone:** **M6** (DC + peak-safety corrections).

---

## Production

| Item | Value | Evidence |
|---|---|---|
| Alias | https://vybz.cloud | live |
| Production SHA | `9bba4d29` | Vercel SUCCESS |
| Bundle | `index-Ccmbs-ed.js` | contains `correct-op-peak`, `correct-op-dc`, `m6.peak-safety` |

## Last completed operations

| PR | Unit | State |
|---|---|---|
| [#80](https://github.com/ALaustrup/VYBZ/pull/80) | M6 DC correction kickoff | **DEPLOYED AND VERIFIED** |
| [#82](https://github.com/ALaustrup/VYBZ/pull/82) | M6 peak-safety + Correct op selector | **DEPLOYED AND VERIFIED** |

## Gate

```
npm run lint / test / build — PASS (391 tests on feature tip)
```

Delivery state: **DEPLOYED AND VERIFIED**.

## Direction

| Item | State |
|---|---|
| Authorised milestone | **M6** + M5 depth as needed |
| Premium-suite phase track | **WITHDRAWN** |
| Next authorised action | Owner-directed: next M6 op (e.g. channel balance) or M5 broadband noise / OR-013 |

## Blockers

None.

## Known contradictions

Native desktop BS.1770 remains approx-pending (M4 carry-forward). Peak safety is sample-peak only — not true-peak/ISP.
