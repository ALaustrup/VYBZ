# Backlog

> **Authority 5 of 5.** Approved future work, deferred work, frozen work, decision-required
> items, external-distribution prerequisites, technical debt, and the opportunity register.
>
> **A backlog entry is not authorisation to implement it.** Work begins only when
> [`AGENTS.md`](./AGENTS.md) names the milestone as authorised.

Last reviewed 2026-08-05.

---

## 0. VYBZ Pro — owner-directed, designed, not yet authorised to build

Owner direction, 2026-08-05: users keep their own files; VYBZ hosting is paid. Purchase
runs on V¢, in the Diablo-style pattern already used for cosmetics — buy a credit pack
with money, spend credits on the entitlement.

**Design status:** decided and encoded as pure rules in `src/lib/proPlan.ts`, covered by
17 tests. **No billing exists.** Nothing charges, nothing grants, and no purchase control
is shown, because the server RPC does not exist yet.

### Recommended configuration

| Decision | Recommendation | Rationale |
|---|---|---|
| Price | **60 V¢ / 30 days** | Exactly $3.00 at the existing $0.05 peg |
| Currency | V¢ only | One currency, one ledger, matches cosmetics |
| Included hosting | **10 GB** | "Unlimited" is not costable against lossless masters |
| Overage | 6 V¢ per GB per period | Disclosed per Law 6 rather than silently throttled |
| Grace after expiry | **30 days public**, with warnings | Nobody's release disappears the hour a payment lapses |
| On lapse | Tracks go **private, never deleted**; owner keeps download | Deleting a creator's work for non-payment is indefensible |
| Renewal | Extends an unexpired period | Renewing early must never destroy paid time |

### What stays free forever

Analysis, mastering, readiness, translation, distribution reports, export packages,
managing and downloading your own files, messaging, live, discovery browsing. All of it
is on-device compute or already-paid infrastructure, so it costs nothing to leave open.

### What Pro pays for

Hosting audio on VYBZ, publishing to the discovery feed, selling through a storefront —
the three things that consume storage and bandwidth.

### Already built

- Buying V¢ with Stripe — `startCreditTopup` → `stripe-credit-topup`, packs at $5/$10/$25
- Spending V¢ on an entitlement — the `purchase_cosmetic` RPC pattern
- Ledger and history — `vc_award`, `vc_list_ledger`
- Client entitlement shape — `ProfileDetails.pro`, `proUntil`, `isPro()`, `ProBadge`

### Missing, and each needs owner approval

1. **A `pro_until` column and `purchase_pro` RPC.** No migration in the repository sets
   `pro` or `proUntil` today, so the entitlement is currently unreachable — `isPro()` can
   never return true. This is a **database migration**.
2. **Storage accounting.** Nothing measures per-user bytes, so overage cannot be billed.
3. **Publish gating.** `PublishToCatalogCard` currently uploads for any signed-in user.
   Gating it on Pro is a product decision with a migration behind it.
4. **Lapse enforcement.** A scheduled job to flip lapsed users' tracks to private.

### Compliance issue — resolved 2026-08-05

The code, store copy, wallet copy and whitepaper previously described V¢ as the precursor
to an exchange-listed asset with a ticker and a target listing window. Masterplan **Law 6**
forbids cryptocurrency and speculative-finance framing, and selling credits to people told
those credits may become tradeable is materially different from selling closed-loop credits.

Owner confirmed removal on 2026-08-05. `VC_TICKER_FUTURE` is deleted, the whitepaper is
reissued as v2.0 with the withdrawal stated in the document, and the store, wallet and
Codex summary now say plainly that V¢ is not tradeable and cannot be withdrawn.

The comment header of `20260727_0071_vc_wallet_ledger.sql` still mentions a future ticker.
Applied migration history is never rewritten, so it stays as a historical record; the
authoritative table comment is corrected in `20260805_0090_pro_hosting.sql`.

---

## 1. Decision required — blocking

These block milestone scoping. Nothing proceeds on any of them.

| ID | Question | Blocks | Size |
|---|---|---|---|
| **DR-01** | Live streaming (LiveKit). Does it survive, and what release function does it serve? | M2, M10 | ~1,600 lines |
| **DR-02** | Messaging, cam calls, video messages, rooms. Retain, redesign, freeze or archive? | M2 | ~2,750 lines |
| **DR-03** | Opportunities board and cosmetics. Masterplan §6 permits opportunity discovery only if later authorised. | M2 | ~510 lines |
| **DR-04** | V¢ tipping. Survives as "optional creator support", or separates from utility credits entirely? | M2, M11 | ~350 lines |
| **DR-05** | Watermarking. Absent from the lifecycle in Masterplan §7. Retain, freeze or archive? | M2 | ~440 lines, 3 edge functions |
| **DR-06** | Onboarding gate. `App.tsx` forces `RoleIntentOnboarding` before the shell. Delete it, or keep a professional-role intake? | M2 | critical path |
| **DR-07** | M4 strategy. Build a BS.1770 meter, or integrate a validated implementation? Cost and licensing implications. | M4 | milestone-defining |
| **DR-08** | Native shell drift. Restructure desktop and Android in lockstep with M3, or let them lag until M9? | M3, M9 | sequencing |

## 2. Approved — scheduled

Ordered by milestone. Detail lives in Masterplan §9–10.

**M2 · Product isolation.** Freeze collaboration (3 files, ~10 import removals). Rename
device sync away from collaboration language. Remove dating in tiers: six files deleted
outright, ~14 shared files edited, schema left orphaned and documented. Archive Living
Home. Delete the orgs stub.

**M3 · Truthful shell.** Hide the eight placeholder navigation entries. Surface the working
Credits, Master and Distribution routes, which have no navigation entry today. Remove all
nine fabricated measurements (§5). Replace the silent landing-page fallback with a real
sign-in prompt that preserves the intended destination. Rebuild the landing page around the
new product identity.

**M4 · Measurement integrity.** Validated integrated loudness and true peak with documented
oversampling. Provenance on every result. Reference vectors and tolerances. Clean separation
of measured, estimated, heuristic and AI outputs.

**M5–M12.** See Masterplan §9.

## 3. Immediate technical-integrity corrections

Priority queue once implementation is authorised. Evidence in
[`docs/architecture/PRODUCTION_REALITY_AUDIT_2026-07-31.md`](./docs/architecture/PRODUCTION_REALITY_AUDIT_2026-07-31.md).

| # | Defect | Location | Milestone |
|---|---|---|---|
| 1 | Hash-derived **ISRC suggestion** — can cause an invalid or colliding identifier on a real release | `packages/processing/metadata/infer.ts:42` | M3 |
| 2 | Hardcoded true peak `-1.5`; true peak never computed anywhere | `DistributionReportPage.tsx:71` | M3 |
| 3 | Hardcoded integrated loudness `-14` when probe absent | `DistributionReportPage.tsx:71` | M3 |
| 4 | Artwork DPI defaulted to 300; never parsed, so the rule can never fire | `DistributionReportPage.tsx:89` | M3 |
| 5 | Hash-derived genre, mood, BPM and confidence score | `infer.ts:39–48` | M3 |
| 6 | Hardcoded `remoteMinutes = 31` driving a live cost warning | `DistributionReportPage.tsx:97` | M3 |
| 7 | `processing-enqueue` reports jobs `completed` that never ran | `supabase/functions/processing-enqueue/index.ts:87` | M3 |
| 8 | Approximate loudness labelled "LUFS" without qualification | `distributionRules.ts:164/174/184` | M3 → M4 |
| 9 | Non-WAV audio yields no measurements; dependent rules skip silently | `readiness/src/worker.ts:44` | M4 |
| 10 | Mastering targets −14 dBFS RMS while −14 is the LUFS figure | `mastering/src/master.ts:68` | M6 |
| 11 | "Limiter" is a linear gain reduction; ceiling mislabelled dBTP | `master.ts:104`, `types.ts:14` | M6 |
| 12 | `stereoWidth` defaults to 1.05 — undisclosed processing on every master | `master.ts:70` | M3 |
| 13 | Output always re-encoded to 16-bit with no dither | `master.ts:155` | M6 |
| 14 | **Suspected** 24-bit stereo path treats a mono mixdown as interleaved stereo | `master.ts:149–154` | M6 — needs a test vector |
| 15 | Expose a safe production build identifier (commit SHA, version, build time) | build config | M3 |

## 4. Frozen

Preserved in the tree, imported by nothing, excluded from production bundles. Not on any
roadmap.

Multi-human collaboration: `src/features/collab/`, `src/platform/collab/`,
`packages/domain/collab/`, `RepoCollabPanel.tsx`, migration `0088` tables, `repo_open_mr`
and `repo_create_branch` in `api.ts`. · VR and immersive. · Bunny as media origin. ·
React Native rewrite. · Spotify-scale catalogue race. · Living Home. · Workspace extraction
stages C/E/F.

## 5. Deferred — owner-gated by cost or credentials

| ID | Item | Gate |
|---|---|---|
| OR-012 | iOS TestFlight | Apple Developer ~$99/yr, signing secrets |
| — | AASA `TEAMID` | Apple Developer |
| — | Notarised macOS DMG | `MAC_CERT_*` |
| — | Android Play listing | Play Console |
| OR-010 | Formal migration-history workflow (`db push` vs raw SQL, CI checksum guard) | Owner process decision |

## 6. External distribution prerequisites

M13 and M14 remain blocked until every item in Masterplan §11 exists and is verified.
Nothing in the repository currently addresses any of them: there are **zero** references to
DDEX, ERN or SFTP, and no DSP delivery code of any kind.

OR-009 (direct distribution) remains parked.

## 7. Technical debt

- Two uninspected stashes: `ops cutover docs WIP` (on `main`), `temp hash drift` (on
  `suite-genesis`). Inspect and resolve — **DR-09**.
- Twelve domains resolve to the Vercel project. Consolidate or let some lapse — **DR-10**.
- Dead feature flags `roleClass` and `liveBoost` are defined and never read.
  `VITE_FEATURE_PREPARE` is undocumented in `.env.example`.
- `LEGACY_REDIRECTS` in `routeManifest.ts` is declared but never applied.
- `CommandBar` is read-only and not mounted. `MoreDrawer`, `OrbDock`, `OrbJoystick`,
  `OrbFan` and the VDock pin catalogue are defined but unmounted.
- Nineteen phase tags remain as immutable history and should not be deleted.
- Historical branch debris: nine `cloud*-b990` branches at an identical old SHA.

## 8. Opportunity register

Ideas with no commitment and no schedule. Promotion into a milestone requires owner
approval and an entry in the Masterplan.

| ID | Idea | Status |
|---|---|---|
| OR-009 | Direct DSP distribution | Parked — see §6 |
| OR-010 | Migration-history workflow | Deferred |
| OR-012 | iOS TestFlight | Deferred |
| OR-013 | Reference-track comparison in the Analysis Engine | Idea — natural M5 extension |
| OR-014 | Artifact, noise, hum and click/pop detection | Idea — M5 extension |
| OR-015 | Codec vulnerability estimation | Idea — M7 extension |
| OR-016 | Podcast and spoken-word specific readiness rules | Idea — M8 extension |
| OR-017 | Separate Chats section (Messages stays DMs-only; Rooms unlinked) | Parked — Artist OS Surface Overhaul 2026-08-07 |
| OR-018 | Instrument Creator — paid one-time unlock for a full VST3 instrument design studio (native DSP / JUCE-class work; not a web placeholder) | Idea — horizon add-on; no suite rail tile until a signed plug-in exists |
