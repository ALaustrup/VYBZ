# STATUS

> **Authority 4 of 5.** The single operational checkpoint. Every claim cites evidence.
> Update it at the end of any unit of work. If it is stale, it is wrong.

**Date:** 2026-08-09
**Branch:** `feat/ai-review-pipeline`
**HEAD:** (merge in progress → tip after merge commit)
**Working tree:** resolving STATUS vs `main` @ `ed906d47`
**Current milestone:** **M6** + Analyzer intake desk + OR-019/023 + AI review infra

---

## Production

| Item | Value | Evidence |
|---|---|---|
| Alias | https://vybz.cloud | live |
| Production SHA | `6bb285d1` | Vercel SUCCESS (`vybz-89sf5eivx`); STATUS tip `ed906d47` docs #97 |
| Bundle | `index-B9lRvaW5.js` | contains `Check your mix`, `analyzer-dropzone`, `Level toward streaming` |

## Last completed operations

| PR | Unit | State |
|---|---|---|
| [#96](https://github.com/ALaustrup/VYBZ/pull/96) | Analyzer intake desk | **DEPLOYED AND VERIFIED** |
| [#98](https://github.com/ALaustrup/VYBZ/pull/98) | AI review pipeline (Stages 1–3) | **IN REVIEW** — merge when Vercel green |

## Gate (feature tip)

```
npm run lint / test / build / check:no-fixtures — PASS (420 tests)
npm run build:e2e — PASS (portal only in fixture bundle)
```

## AI review pipeline

```
npm run ai-review
→ http://127.0.0.1:4173/__e2e__/ai-review
```

- Stage 1: fixture portal (read-only, never production)
- Stage 2: observation artifacts → `docs/ai-review/` (**artifact ≠ build order**)
- Stage 3: `.cursor/rules/ai-review-pipeline.mdc` — plans from observations; implement only with explicit owner approval

## Direction

| Item | State |
|---|---|
| Authorised | Merge #98 when checks green |
| Parked | OR-020–022, OR-024–026 |
| Stash | `wip app-bar wordmark before ai-review-pipeline` |
| Next authorised action | After merge: smoke `npm run ai-review`; restore wordmark stash when ready |

## Blockers

None. GitHub Actions shows systemic `BuildFailed` / startup_failure on recent mains; Vercel is the live green gate for this PR.

## Known contradictions

Native desktop BS.1770 remains approx-pending (M4 carry-forward). Peak safety is sample-peak only — not true-peak/ISP. Leveling auto-fix uses RMS proxy toward −14, not full BS.1770 gain-to-target.
