# STATUS

> **Authority 4 of 5.** The single operational checkpoint. Every claim cites evidence.
> Update this at the end of any unit of work. If it is stale, it is wrong.

**Date:** 2026-08-08
**Branch:** `main`
**HEAD:** `246234b9` (merge PR #94 master password lock)
**Working tree:** clean after STATUS checkpoint
**Current milestone:** **M6** + **OR-019** + **OR-023** + master password lock.

---

## Production

| Item | Value | Evidence |
|---|---|---|
| Alias | https://vybz.cloud | live |
| Production SHA | `246234b9` | Vercel SUCCESS (`vybz-bgrst89ra`) |
| Bundle | `index-YfO5dPBd.js` | contains `Set master password`, `lock_account_password`, `andrewiguess@gmail.com` |
| Auth users | 1 | only `andrewiguess@gmail.com` (admin); others wiped under owner override 2026-08-08 |
| Password lock | `password_locked_at` null until master locks | migration `master_password_lock` applied |

## Last completed operations

| PR | Unit | State |
|---|---|---|
| [#92](https://github.com/ALaustrup/VYBZ/pull/92) | OR-023 Alpha invite keys | **DEPLOYED AND VERIFIED** |
| [#94](https://github.com/ALaustrup/VYBZ/pull/94) | Master password lock screen | **DEPLOYED AND VERIFIED** |

## Gate

```
npm run lint / test / build — PASS (406 tests on feature tip)
```

Delivery state: **DEPLOYED AND VERIFIED**.

## Direction

| Item | State |
|---|---|
| Authorised | **M6** + **OR-019 V1** + **OR-023**; OR-020–022 and OR-019 V2 parked |
| Premium-suite phase track | **WITHDRAWN** |
| Next authorised action | Owner: sign in → lock master password on screen; then mint invite batches |

## Blockers

None.

## Known contradictions

Native desktop BS.1770 remains approx-pending (M4 carry-forward). Peak safety is sample-peak only — not true-peak/ISP.
