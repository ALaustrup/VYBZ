# STATUS

> **Authority 4 of 5.** The single operational checkpoint. Every claim cites evidence.
> Update it at the end of any unit of work. If it is stale, it is wrong.

**Date:** 2026-08-09
**Branch:** `feat/or026-stereo-width-correct`
**HEAD:** (tip after commit)
**Working tree:** clean after commit
**Current milestone:** **M6 / OR-026** - hum + width; EQ assist next

---

## Production

| Item | Value | Evidence |
|---|---|---|
| Alias | https://vybz.cloud | live |
| Production SHA | `1cf0d237` | Merge PR #108 hum (pre this unit) |

## Last completed operations

| Unit | State |
|---|---|
| PR #107 Alpha welcome | **MERGED** |
| PR #108 OR-026 hum | **MERGED** `1cf0d237` |
| OR-026 stereo width | **CODED · LOCAL VALIDATED** - this branch |

## This unit (OR-026 width)

| Change | Detail |
|---|---|
| DSP | `applyStereoWidth` m6.stereo-width.1 - mid/side widen/narrow + mono guard |
| Correct | Stereo width auto op |
| Analyzer | NARROW / SIDE_HEAVY / OUT_OF_PHASE / MONO_COMPAT_LOSS ship Fix |

## Gate (local)

```
npm run lint / test (446) / build / check:no-fixtures - PASS
```

## Direction

Next authorised: EQ assist -> click attenuate -> BS.1770 gain-to-target.

## Known contradictions

Native desktop BS.1770 approx-pending. Peak safety sample-peak only.