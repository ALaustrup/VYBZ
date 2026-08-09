# STATUS

> **Authority 4 of 5.** The single operational checkpoint. Every claim cites evidence.
> Update this at the end of any unit of work. If it is stale, it is wrong.

**Date:** 2026-08-08
**Branch:** `main`
**HEAD:** `4fa11d71` (merge PR #92 OR-023 Alpha invite keys)
**Working tree:** clean after STATUS checkpoint
**Current milestone:** **M6** + **OR-019 Stem Maker V1** + **OR-023 Alpha invite keys**.

---

## Production

| Item | Value | Evidence |
|---|---|---|
| Alias | https://vybz.cloud | live |
| Production SHA | `4fa11d71` | Vercel SUCCESS (`vybz-93y9ihoiz`) |
| Bundle | `index-nCGjMPvr.js` | contains `redeem_invite_key`, `mint_invite_keys`, `VYBZ-A1-`, `Invite-only alpha` |
| DB | migration `alpha_invite_keys` | applied to `xixmneooyufbeftdfpcm`; RPCs `mint_invite_keys` / `redeem_invite_key` / `has_alpha_access` present |

## Last completed operations

| PR | Unit | State |
|---|---|---|
| [#90](https://github.com/ALaustrup/VYBZ/pull/90) | OR-019 Stem Maker V1 assembly | **DEPLOYED AND VERIFIED** |
| [#92](https://github.com/ALaustrup/VYBZ/pull/92) | OR-023 Alpha invite keys hard gate | **DEPLOYED AND VERIFIED** |

## Gate

```
npm run lint / test / build — PASS (404 tests on feature tip)
```

Delivery state: **DEPLOYED AND VERIFIED**.

## Direction

| Item | State |
|---|---|
| Authorised | **M6** + **OR-019 V1** + **OR-023**; OR-020–022 and OR-019 V2 parked |
| Premium-suite phase track | **WITHDRAWN** |
| Next authorised action | Owner: mint giveaway batches in Admin → Invites; deepen M6 / OR-020 when authorised |

## Blockers

None.

## Known contradictions

Native desktop BS.1770 remains approx-pending (M4 carry-forward). Peak safety is sample-peak only — not true-peak/ISP.
