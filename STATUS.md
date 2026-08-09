# STATUS

> **Authority 4 of 5.** The single operational checkpoint. Every claim cites evidence.
> Update it at the end of any unit of work. If it is stale, it is wrong.

**Date:** 2026-08-09
**Branch:** `feat/or026-mains-hum-correct`
**HEAD:** (tip after commit)
**Working tree:** clean after commit
**Current milestone:** **M6 / OR-026** - hum shipped locally; width next

---

## Production

| Item | Value | Evidence |
|---|---|---|
| Alias | https://vybz.cloud | live |
| Production SHA | `e47d7cbb` | Merge PR #107 Alpha welcome (pre this unit) |

## Last completed operations

| Unit | State |
|---|---|
| PR #107 Alpha welcome + feedback FAB | **MERGED** `e47d7cbb` |
| OR-026 hum reduce | **CODED · LOCAL VALIDATED** - this branch |

## This unit (OR-026 hum)

| Change | Detail |
|---|---|
| DSP | `applyMainsHumReduce` - peaking cuts at f/2f/3f; version `m6.mains-hum.1` |
| Correct | New Mains hum op + bypass/before-after |
| Analyzer | `AUDIO_MAINS_HUM` Tier A ship auto-fix |
| Docs | AGENTS + IDEAS mark OR-026 authorised |

## Gate (local)

```
npm run lint - PASS
npm run test - 442 passed
npm run build - PASS
npm run check:no-fixtures - OK
```

## Direction

| Item | State |
|---|---|
| Authorised continuous | OR-026 remainder: width -> EQ assist -> click -> BS.1770 gain-to-target |
| Parked | OR-020-022, OR-024-025 |

## Blockers

None.

## Known contradictions

Native desktop BS.1770 remains approx-pending (M4 carry-forward). Peak safety sample-peak only. Leveling RMS proxy toward -14.