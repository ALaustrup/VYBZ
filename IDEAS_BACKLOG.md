# Backlog

> **Authority 5 of 5.** Approved future work, deferred work, frozen work, decision-required
> items, external-distribution prerequisites, technical debt, and the opportunity register.
>
> **A backlog entry is not authorisation to implement it.** Work begins only when
> [`AGENTS.md`](./AGENTS.md) names the milestone as authorised.

Last reviewed 2026-08-11.

---

## 0. VYBZ Pro — WITHDRAWN from active leftover (2026-08-11)

Owner removed Pro hosting billing from the active leftover / decision queue (Suite UX
authorisation). Design notes in `src/lib/proPlan.ts` may remain historical; **not authorised
to build**. Re-auth required before any Pro hosting migration or purchase RPC.

~~Previous §0 design table retained in git history only.~~

---

## 1. Decision required — blocking

These block milestone scoping. Nothing proceeds on any of them.

| ID | Question | Blocks | Size |
|---|---|---|---|
| **DR-01** | ~~Live streaming (LiveKit)~~ | **WITHDRAWN** from active leftover 2026-08-11 — Live receives bugfixes / shared-shell only (AGENTS). | — |
| **DR-02** | Messaging, cam calls, video messages, rooms. Retain, redesign, freeze or archive? | M2 | ~2,750 lines |
| **DR-03** | ~~Opportunities board and cosmetics board deepen~~ | **WITHDRAWN** from active leftover 2026-08-11 — cosmetics store equip remains; opportunity board not a work item. | — |
| **DR-04** | V¢ tipping. Survives as "optional creator support", or separates from utility credits entirely? | M2, M11 | ~350 lines |
| **DR-05** | Watermarking. Absent from the lifecycle in Masterplan §7. Retain, freeze or archive? | M2 | ~440 lines, 3 edge functions |
| **DR-06** | Onboarding gate. `App.tsx` forces `RoleIntentOnboarding` before the shell. Delete it, or keep a professional-role intake? | M2 | critical path |
| **DR-07** | M4 strategy. Build a BS.1770 meter, or integrate a validated implementation? Cost and licensing implications. | M4 | milestone-defining |
| **DR-08** | Native shell drift. Restructure desktop and Android in lockstep with M3, or let them lag? (M9 VDock closed 2026-08-10.) | M3 | sequencing |

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
| — | iOS AVAudioSession focus (M9 residual) | Cap iOS deepen + Apple signing; Android AudioManager shipped |
| — | Suite visual / placement polish — professional music-platform look (tool pages, rail, empty states, density) | Owner-scheduled; not M10; does not reopen M7–M9 contracts |
| OR-010 | Formal migration-history workflow (`db push` vs raw SQL, CI checksum guard) | Owner process decision |
| OR-044 | Google Drive / OneDrive Library sync (OAuth apps, sync conflict policy, egress cost) | Google Cloud + Microsoft Azure app registration; owner Pro/hosting policy |

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
| OR-014 | Artifact, noise, hum and click/pop detection | Partial — hum + click/pop shipped; broadband noise still open |
| OR-015 | Codec vulnerability estimation | Partial — M7 lossy-style listen preview shipped; real encode metrics still open |
| OR-016 | Podcast and spoken-word specific readiness rules | Idea — M8 extension |
| OR-017 | Separate Chats section (Messages stays DMs-only; Rooms unlinked) | Parked — Artist OS Surface Overhaul 2026-08-07 |
| OR-018 | Instrument Creator — paid one-time unlock for a full VST3 instrument design studio (native DSP / JUCE-class work; not a web placeholder) | Idea — horizon add-on; no suite rail tile until a signed plug-in exists |
| OR-019 | Stem Maker — V1 assembly from exported stems; V2 paid/desktop source separation | **V1 shipped** — deepen parked 2026-08-10; V2 still parked (see §8.1) |
| OR-020 | Loops / Sample Pack Creator — streamlined pack build → ZIP → optional storefront handoff | **Shipped** — deepen parked 2026-08-10 (see §8.1) |
| OR-029 | AI-finish analysis — heuristic findings for over-processed / AI-assisted masters; advise when unfixable | **Shipped** — deepen parked 2026-08-10 |
| OR-030 | Visualizer studio high-res (up to experimental 8K) + layer customize | **Parked** 2026-08-10 — re-auth for further viz work |
| OR-031 | Pro networking + discovery for lesser-known artists (release-centered) | **V1 shipped** — deepen parked 2026-08-10; no dating/swipe |
| OR-021 | Batch Processor — deepen desktop/web batch (correct, convert, report) | Idea — parked; not authorised (see §8.1) |
| OR-022 | Project Archiver — checksummed release-project archive (not DSP delivery) | Idea — parked; not authorised (see §8.1) |
| OR-023 | Alpha invite keys — hard gate + Admin mint for FB/Reddit giveaways | **Authorised 2026-08-08** — hard gate (see §8.2) |
| OR-024 | Real-time DAW readiness meter plug-in (VST3/AU) — live loudness/peak/stereo vs Analyzer targets | Idea — horizon; native desktop; not Instrument Creator (OR-018) |
| OR-025 | Library track menu — Add artwork + optional Art Check handoff | Idea — parked; follow-on after Analyzer intake desk |
| OR-026 | Correct deepen Tier B auto-fix ops (hum, width, EQ assist, click attenuate, BS.1770 gain-to-target) | **Shipped sequence 2026-08-09** — PRs #108–#111 (see §8.3); enough Correct deepen — further Tier B needs re-auth |
| OR-027 | M6 close-out — loudness-matched A/B on Correct + owner M6 gate sign-off | **Authorised 2026-08-09** |
| OR-028 | M7 Translation Lab kickoff — streaming −14 LUFS preview (disclosed) | **Authorised 2026-08-09** |
| OR-044 | Library cloud import/export — Google Drive + OneDrive; preferred-folder sync so media stays available local↔cloud | **Idea — parked** (see §8.6); not authorised |

### 8.1 Producer toolkit (2026-08-08)

Owner parked OR-019–OR-022, then authorised **OR-019 V1 assembly** the same day.
**OR-020 V1** authorised **2026-08-09** (assemble ZIP + storefront handoff). **OR-021–OR-022**
and **OR-019 V2** stay parked. Masterplan §9 remains the only plan.

**Library / catalog isolation (locked):** stems, loops, and pack working-set assets are
**not** auto-ingested into the listening catalog / Library feed. No automatic `createDrop`
or catalog publish from Stem Maker / Pack Creator. The user must **manually promote** a
file into the catalog (or attach to a release). Release Analyzer / Library drag-in keep
current behavior for release audio only.

**Reuse (do not rebuild):** storefront sell path (`src/features/storefront/`); desktop
batch (`src/features/processing/desktopBatchQueue.ts`); Media Converter + Correct; M8/M12
checksummed packaging patterns.

#### OR-019 — Stem Maker

- **V1 (assembly):** import multi-file stem folders / named WAVs; naming conventions;
  per-stem loudness/peak check (reuse analysis); optional DC / peak-safety from Correct;
  package as labeled stem-set ZIP with manifest (Law 1 — measured only).
- **V2 (separation):** cloud or desktop GPU source separation (Demucs-class); V¢ or Pro
  entitlement; honest “AI estimate / not a DAW stem” labeling; never claim DSP delivery;
  never a fake browser-only split.
- **Library rule:** outputs stay in Stem workspace until user promotes.
- **Horizon:** after M6 correction depth; assembly near M8 packaging; separation
  desktop/cost-gated (see §0 Pro / V¢).

#### OR-020 — Loops / Sample Pack Creator

- **V1 (authorised):** ingest WAVs → measure peak/RMS/duration → folder by kind heuristic
  (`oneshots/` / `loops/` / `samples/`) → `manifest.json` ZIP → download or handoff toast
  to `/tools/packs/new`. No Library auto-ingest. No BPM/key/slice yet.
- Not a second storefront; selling stays storefront.
- **Later:** slice/normalize/tag, licenses, richer scan.

#### OR-021 — Batch Processor

- Expand beyond current portable analyze queue: multi-file Correct ops, silence trim,
  convert-to-WAV, stem-set normalize, report CSV/JSON.
- Prefer Platform Bridge + desktop for large files.
- **Horizon:** deepen existing desktop batch; no second queue framework without a consumer.

#### OR-022 — Project Archiver

- Reproducible archive of a Release Project: audio, artwork, metadata draft, analysis
  probes, correction renders, checksums, processing versions.
- Distributor-adjacent packaging honesty — **not** DSP delivery (Masterplan M12).
- **Horizon:** M8/M12 packaging lane; share manifest ideas with stem-set and pack ZIP.

### 8.2 Alpha invite keys (OR-023) — authorised 2026-08-08

Hard gate for producer alpha giveaways (Facebook / Reddit / Discord).

- **Model:** waitlist remains notify-only; access requires redeem of a minted key (or admin).
- **Storage:** `invite_keys.code_hash` only; plaintext returned once at mint.
- **Format:** `VYBZ-A1-{BATCH}-{TOKEN}`; default single-use; expiry 14–60 days.
- **Gate:** `App.tsx` after profile load — `hasAlphaAccess` → else `InviteRedeemPage`.
- **Owner tooling:** Admin → Invites tab (mint, copy, CSV, revoke batch).
- **Grandfather:** profiles existing at migration keep `alpha_access_at`.
- **Not in scope:** selling keys, Stripe/Pro bundling, soft banner-only gate.

### 8.3 Analyzer follow-ons (2026-08-09)

After the audio-only Analyzer intake desk (Tier A auto-fix + Library add):

- **OR-025** — Library submenu **Add artwork** (not Analyzer); optional Art Check QC. **Parked.**
- **OR-026** — Correct Tier B ops wired into Analyzer Fix. **Authorised 2026-08-09**;
  sequence hum → width → EQ → click → BS.1770 gain-to-target **shipped** (#108–#111).
- **OR-027** — M6 close-out loudness-matched A/B + owner gate sign-off. **Authorised 2026-08-09.**
- **OR-028** — M7 Translation Lab kickoff (streaming −14 preview). **Authorised 2026-08-09.**
- **OR-024** — Native VST3/AU **readiness meter** for real-time mix assist; share measurement
  defs with `@vybz/processing`. Not OR-018 Instrument Creator. Desktop/native milestone. **Parked.**

### 8.4 Owner brainstorm — media working set + suite app clarity (2026-08-11)

Owner explored suite apps in depth after M10 Wave R + Store Market wedge 1.

Architecture brief (authorised source of truth):
[`docs/architecture/creative-os-song-workspace-brief.md`](./docs/architecture/creative-os-song-workspace-brief.md).

| ID | Idea | Status |
|---|---|---|
| OR-032 | **Library-first working set** — one ingest; tools open the active track from Library / Analyzer pending audio; no re-drop per app | **Shipped** — PR #151 |
| OR-033 | **Rail label Translation Lab** — product is travel listening (streaming / device / codec), not language translation | **Shipped** with OR-032 |
| OR-034 | **Correct desk redesign** — denser music-ops Correct workbench; clearer op map vs Analyzer Fix; library-sourced input | **Shipped** — PR #154 |
| OR-035 | **Guided release workflow / What next** — after Analyzer findings, suggested next steps driven by measured codes only | **Shipped** — PR #155 |

#### Recommended model for OR-032

1. **Canonical media** lives in Library (`drops`) + optional Analyzer session blob (`pendingUpload`).
2. **Active working set** — one (or few) selected track(s) in suite context; apps read context instead of requiring a new drop.
3. **App intake order:** prefer working set → Library picker → dropzone fallback.
4. **Automation (OR-035):** Analyzer finding codes already map to Correct `?op=` and Translation links; extend to a measured “next desk” strip without inventing readiness scores.
5. **Cost honesty:** browser Object URLs are free/session; durable cloud masters touch VYBZ Pro hosting (§0) — never claim unlimited free hosting.

### 8.5 Creative OS follow-ons (authorised sequence, not yet building)

Owner confirmed 2026-08-11. Separate reviewable PRs after OR-032.

| ID | Idea | Status |
|---|---|---|
| OR-036 | Midi Maker — built-in sound preview + random generator | Shipped (PR #156) |
| OR-037 | Converter — many more formats | Shipped (PR #157) |
| OR-038 | Sample Pack Maker — build full packs from Library, publish to Store | Shipped (PR #158) |
| OR-039 | Store — iTunes-style marketplace for packs + music; discovery feed (browse/listen) | Shipped (PR #159) |
| OR-040 | Landing drag-drop → per-track focused song workspace | Shipped (PR #160) |
| OR-041 | Optional Ableton / DAW project folder link tied to a track | Shipped (PR #161) |
| OR-042 | Analyzer reliability — keep name **Analyzer** only; scan/drop must work | **Authorised — active wedge** |

#### Correct redesign notes (OR-034)

- Filename `DcOffsetCorrectPage` understates nine ops; UI should read as a correction desk.
- Keep Law 5 VDock A/B; keep credit-free local ops; deepen is parked unless re-authorised.
- Primary win after OR-032: open Correct with the active Library / Analyzer track preloaded.

### 8.5 OR-043 — Vibes Radio synchronized broadcast (2026-08-11)

**Authorised.** Global server-clock radio replaces AmbientRadioHost. Beds at
`public/audio/1.wav` (greeting, signed-in) and `2.wav` (interstitial, guests never hear
track 1). Edge `vibes-radio` is logic-only; migration `20260811_0093_vibes_radio`.

### 8.6 OR-044 — Library cloud sync (Google Drive + OneDrive) — parked 2026-08-11

Owner requested import from Google Drive / OneDrive, export that creates a preferred
cloud folder, and bidirectional sync so Library media stays available local↔cloud.

**Status:** Idea only — **not authorised to build.** Parked until owner re-authorises as
a discrete wedge (outside Creative OS OR-038–OR-042 sequence unless explicitly promoted).

**Why gated:** OAuth client apps + secrets, provider API quotas, conflict/merge policy,
Law 1 honesty on "always available" (offline / revoked token / quota must be disclosed),
and VYBZ Pro hosting vs BYO cloud cost (IDEAS §0). Installing SDKs needs owner approval.

**When authorised, prefer:** import-first thin wedge (picker → Library ingest) before
full bidirectional sync; never invent catalog rows for files that failed to fetch.

