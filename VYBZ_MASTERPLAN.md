# VYBZ Masterplan — Suite Genesis

> **Supreme product authority.** Conflict order: this file → `AGENTS.md` →
> `ARCHITECTURE.md` → `SECURITY.md` → `VERSIONING.md` → Opportunity Register →
> `CHANGELOG.md` → ops docs. Pre–Suite Music Hub doctrine lives in
> [`docs/archive/pre-suite-2026/`](./docs/archive/pre-suite-2026/) and is never authoritative.

| Field | Value |
|-------|--------|
| **Owner** | Astra Matrix, Inc. |
| **Product** | VYBZ |
| **Tagline** | Find Yours. |
| **Promise** | Everything between finished and released. |
| **Category** | Release operating system for independent music |
| **Generation** | Beta-1A (Suite Genesis) — planned; untagged until production gates |
| **Domain** | https://vybz.cloud |
| **Repository** | ALaustrup/VYBZ |
| **Architecture** | Single-root Vite SPA · Supabase · modular product namespaces |

---

## 1. Mission

VYBZ is the infrastructure between a creative project and a commercially released,
protected, properly documented body of work. It is not merely a streaming platform,
distributor, mastering service, metadata editor, sample marketplace, file locker,
social network, or DAW — it connects those activities.

The existing Music Hub (artist pages, VDock, tips, live, catalog) remains as the
**public presentation and audience layer**. It is the final third of a larger
professional lifecycle, not the whole product.

### Core product loop

```text
Create project
→ import audio and artwork
→ analyze readiness
→ repair metadata and credits
→ prepare masters
→ protect prerelease files
→ approve release package
→ distribute
→ publish artist page
→ play through VDock
→ perform live
→ sell and receive support
```

Legacy loop `upload → /u/:id → VDock → tip → live` stays embedded in that final third.

---

## 2. Product laws

1. No greenfield rewrite; extend the existing SPA and Supabase project.
2. No second database or authentication system.
3. No Bunny reintroduction as media origin (Storage + LiveKit only).
4. No paid provider enabled by default; every paid job needs estimate + reservation.
5. No agent-only production release; no silent commit/publish of creative work.
6. AI may suggest, normalize, detect, explain — never invent contributors, approve
   splits, sign agreements, or submit rights without human confirmation.
7. Security features are not marketed beyond demonstrated capability.
8. No ads, no anonymity, no connection paywalls, no pay-to-win ranking, safety never paid.
9. Dating-first / Spark-as-home / Living Home / VR stay retired or archived.
10. Vc is for tips, cosmetics, and community identity — not to obscure dollar prices
    of professional processing.

---

## 3. Suite modules

| Product | Function | Accent |
|---------|----------|--------|
| **VYBZ Home** | Project, release, and audience command center | Cyan |
| **VYBZ Studio** | Music Repos, versions, branches, collaboration | Orange |
| **VYBZ Prepare** | Distribution-readiness workspace | Ice cyan |
| **VYBZ Credits** | Metadata, contributors, splits, approvals | Indigo |
| **VYBZ MasterReady** | Audio analysis, mastering, deliverables | Amber / green |
| **VYBZ CoverLab** | Artwork analysis, repair, visual delivery | Magenta / violet |
| **VYBZ Sentinel** | Secure prerelease sharing, watermarking, provenance | Red |
| **VYBZ Relay** | Distribution package delivery and status | Blue / green |
| **VYBZ Live** | Performances, sessions, listening events | Crimson |
| **VYBZ Market** | Sample packs and digital music products | Violet / gold |
| **VYBZ Artist** | Public storefront, catalog, support | Brand cyan |
| **VDock** | Persistent playback, queue, credits, support | Shared |

Shared kernel: identity, projects, releases, storage, billing, permissions,
notifications, audit, jobs, cost control, design primitives, search, a11y.

---

## 4. Preserve / refactor / retire

### Preserve

Auth and profiles · RLS / definer RPCs · Supabase `xixmneooyufbeftdfpcm` ·
existing Storage buckets · Music Repos + `tools/vybz-bridge` · VDock / AudioBus ·
artist pages · Stripe · LiveKit · Sample Pack Storefront · watermark / provenance ·
feature flags · Capacitor · additive migrations only.

### Refactor (later phases)

App shell · navigation · routes · dashboard home · design tokens · motion ·
module boundaries · job processing · provider adapters · usage metering ·
docs (this phase) · CI / tests · product copy · error/empty states · deploy hosts.

### Retire or archive

Dating-first presentation · Spark as primary surface · Living Home · Bunny media
doctrine · paid ranking experiments · “social music hub only” copy · Hobby as
permanent commercial host implication.

---

## 5. Revenue model

| Tier | Includes |
|------|----------|
| **Free** | Identity, artist page, VDock, local projects, browser readiness scans, basic artwork/metadata, limited secure room, limited Live, market browse |
| **Creator** | Release workspace, Credit Passport, expanded secure sharing, full reports, exports, analytics, Profile Enhancement |
| **Producer** | Music Repos, Engine/Bridge, beat licensing, client rooms, watermarked previews, advanced analysis |
| **Studio** | Teams, multi-contributor, client approval, batch analysis, branded reports, storage, API |
| **Usage-backed** | AI visuals, managed mastering, advanced watermarking, distribution delivery, large storage/email/Live — always cost-reserved |

---

## 6. Phased program

| Phase | Name | Exit gate (summary) |
|------:|------|---------------------|
| **0** | Suite Genesis doctrine | No active doc contradicts Suite; inventories exist |
| **1** | Engineering + design foundation | Suite shell placeholders + CI gates |
| **2** | Prepare MVP | Free browser readiness report |
| **3** | Credits + metadata | Multi-account approved credit state |
| **4** | MasterReady | Analyze/prepare audio without cloud compute |
| **5** | CoverLab | Scan/repair/export artwork without paid provider |
| **6** | Sentinel | Secure individualized preview + revoke/detect |
| **7** | Relay | One real partner delivery + status reconcile |
| **8** | Artist / VDock / Live / Market unification | Continuous pro → public lifecycle |
| **9** | Automation + scale | Cost Sentinel, health, backups, org billing |

`Beta-1A` remains **untagged** until shell, cost kernel, and first Prepare scan
pass production gates.

---

## 7. Brand and copy (platform)

**Eyebrow:** The release operating system for independent music.

**Headline:** Everything between finished and released.

**Body:** Prepare, protect, credit, master, package and present your music from
one connected workspace.

**Primary CTA:** Start a release · **Secondary:** Run a free readiness scan

**Pricing principle:** Start free. Pay only when a release needs paid infrastructure
or professional processing.

Brand principle: *The platform provides precision. The artist provides expression.*

---

## 8. Definition of done (Suite Genesis Phase 0)

- [x] `suite-genesis` branch
- [x] Pre-suite doctrine archived
- [x] Root docs rewritten to Suite direction
- [x] Documentation tree established
- [x] Route / migration / provider / cost inventories
- [x] Bunny origin doctrine removed from active docs
- [x] Phase 1 engineering foundation (tokens, primitives, SuiteShell, CI)
- [ ] Phase 2 Prepare MVP (next)

Full product DoD for later modules: loading, empty, error, and degraded-provider
states; human approval for rights/payments/distribution; cost reservation for paid jobs.
