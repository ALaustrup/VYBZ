# STATUS

> **Authority 4 of 5.** The single operational checkpoint. Every claim cites evidence.
> Update this at the end of any unit of work. If it is stale, it is wrong.

**Date:** 2026-08-08
**Branch:** `feat/m6-channel-balance-correct`
**HEAD:** pending commit — based on `main` @ `1514e94f`
**Working tree:** dirty until commit
**Current milestone:** **M6** (DC + peak-safety + channel balance).

---

## Production

| Item | Value | Evidence |
|---|---|---|
| Alias | https://vybz.cloud | live |
| Prior tip | `9bba4d29` peak safety | PR #82 verified |
| This branch | **NO** | not merged |

## Last completed operations

1. PR #82 peak safety — **DEPLOYED AND VERIFIED**.
2. **This unit** — M6 L/R channel-balance correct (`m6.channel-balance.1`) + Correct op tile.

## Gate on this branch

```
npm run lint              — PASS
npm run test              — PASS 394/394 (77 files)
npm run build             — PASS
```

Delivery state: **IMPLEMENTED** (local) — not merged.

## Direction

| Item | State |
|---|---|
| Authorised milestone | **M6** + M5 depth as needed |
| Next authorised action | Merge + verify `correct-op-balance` on prod |
