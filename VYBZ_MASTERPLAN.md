# VYBZ Master Blueprint — Suite Genesis · Multi-Platform

> **Supreme product and architecture authority.** Conflict order: this file →
> `AGENTS.md` → `ARCHITECTURE.md` → `SECURITY.md` → `VERSIONING.md` →
> Opportunity Register → `CHANGELOG.md` → ops docs.
>
> Pre–Suite Music Hub doctrine: [`docs/archive/pre-suite-2026/`](./docs/archive/pre-suite-2026/)
> (never authoritative).
>
> This document is the **implementation-grade Master Blueprint** for autonomous
> agents continuing VYBZ across web, desktop, Android, and iOS.

| Field | Value |
|-------|--------|
| **Owner** | Astra Matrix, Inc. |
| **Product** | VYBZ |
| **Tagline** | Find Yours. |
| **Promise** | Everything between finished and released. |
| **Category** | Release operating system for independent music |
| **Generation** | Beta-1A (Suite Genesis) — planned; **untagged** until delivery gates pass |
| **Domain** | https://vybz.cloud |
| **Repository** | `ALaustrup/VYBZ` only |
| **Integration branch** | `main` (production) |
| **Clients** | VYBZ Cloud · VYBZ Desktop · VYBZ Mobile (Android, iOS) |
| **Backend** | VYBZ Platform Services (one Supabase project) |
| **Blueprint revision** | **v2 — 2026-07-31**, rewritten after the Production Reality Audit |

**What changed in v2 and why it matters:** eighteen phases were merged, tagged, and
deployed between 2026-06 and 2026-07-31, yet an audit of live production found that an
ordinary visitor could not reach a single one of them. The engineering was real; the
*delivery* was not. v2 keeps every piece of durable doctrine from v1 and adds the one
thing v1 lacked — a definition of "done" that includes the user. Full evidence:
[`docs/architecture/PRODUCTION_REALITY_AUDIT_2026-07-31.md`](./docs/architecture/PRODUCTION_REALITY_AUDIT_2026-07-31.md).

---

## 0. Delivery vocabulary (read this before claiming anything is complete)

v1 of this blueprint used a single word — "Complete" — for work that had merged. That
word silently covered three very different realities: a feature a user can find and
use, a feature that exists but nobody can reach, and a native app that was never
distributed. **That ambiguity is now forbidden.**

Every feature, phase, and PR must be described using exactly one of these states:

| State | Means | Proof required |
|-------|-------|----------------|
| `CODE MERGED` | Source is on `main` | Commit SHA |
| `BUILT` | Included in the production bundle | String/asset fingerprint in the deployed artifact |
| `DEPLOYED` | Live on the production alias | Vercel deployment SHA + alias |
| `REACHABLE` | A user who knows the URL can load it at the intended auth level | Live request against `vybz.cloud` |
| `DISCOVERABLE` | A user can *find* it by navigating, without being told a URL | Named entry point in nav, or a documented deliberate alternative |
| `PRODUCTION-VERIFIED` | The primary flow was exercised against production and observed working | Screenshot or recorded session |
| `DELIVERED` | All of the above | All of the above |

Allowed phase statuses, in the order of increasing truth:

`DOCUMENTED ONLY` · `STUB OR SCAFFOLD` · `INFRASTRUCTURE ONLY` · `NATIVE-PLATFORM ONLY` ·
`PARTIALLY IMPLEMENTED` · `IMPLEMENTED BUT NOT DELIVERED` · `DEPLOYED BUT UNVERIFIED` ·
`DELIVERED AND PRODUCTION-VERIFIED`

Three hard rules follow:

1. **Merged is not delivered.** A green CI run, a merge commit, and a git tag together
   prove only `CODE MERGED`.
2. **Reachable is not discoverable.** A route that works only when typed into the
   address bar has not been delivered to anyone. It is a private API with a URL.
3. **No phase may be recorded as complete in `AGENTS.md`, `CHANGELOG.md`, or an exit
   gate without naming its delivery state from the table above.**

---

## 1. Executive vision

VYBZ is the infrastructure between a creative project and a commercially released,
protected, properly documented body of work. It is not merely a streaming platform,
distributor, mastering service, metadata editor, sample marketplace, file locker,
social network, or DAW — it connects those activities.

**Governing architectural principle:**

> One VYBZ product core, one shared cloud platform, and platform-specific application
> shells.

| Surface | Role |
|---------|------|
| **VYBZ Cloud** | Browser SPA — universally accessible, public-facing, fastest release channel, complete product |
| **VYBZ Desktop** | Tauri 2 workstation (Windows first, macOS/Linux targets built) — native files, batch, local processing, dense professional UI |
| **VYBZ Mobile** | Capacitor client — Android first, iOS shell built — touch workflows, import/share, push, mobile-safe sessions |
| **VYBZ Platform Services** | Shared Auth, Postgres+RLS, Storage, Realtime, Edge Functions, jobs, entitlements, billing, notifications |

A user owns **one account, one creative identity, and one continuous body of work**
that follows them across browser, desktop, and mobile. Clients must not become
disconnected apps with duplicated business logic.

### Core product loop

```text
Create Release Project
→ import audio and artwork (any client)
→ analyze readiness (portable / native / remote)
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

Legacy audience loop `upload → /u/:id → VDock → tip → live` remains the **final third**
(Artist / VDock / Live / Market), not the sole north star.

### The delivery corollary (new in v2)

The loop above is worthless if a visitor cannot enter it. **VYBZ Cloud's public
entry path is part of the product, not marketing chrome.** Any phase that adds a
capability to the loop must also answer: *how does a real person arrive here?*

---

## 2. Current verified state

*Every fact below was verified against the live system on **2026-07-31 / 2026-08-01 UTC**.
Do not invent missing artifacts. Do not soften a status without new evidence.*

### 2.1 Deployment truth (audit-proven)

| Fact | Value | Evidence |
|------|-------|----------|
| Repository | `github.com/ALaustrup/VYBZ` (private, repoId `1289727202`) | Vercel deployment meta; local `git remote -v` |
| Vercel team / project | Astra Matrix `team_gq3IWtz1kK0aO7kzMrrk6N6a` / `vybz` `prj_LY89Q0WAbKMfNmtYTyg1eQRrBfbI` | `.vercel/project.json` matches live project |
| Production branch | `main` | All `target: production` deployments |
| Root directory | Repository root | Root `vercel.json`, no override |
| Framework / build | `vite` · `npm run build` · output `dist` · Node `24.x` | `vercel.json`, project settings |
| Production SHA | `a84d984ad6a5d242b44f0d6acc3427b450de8446` | Deployment `dpl_4Mngw…` meta **and** PR fingerprints in the live bundle |
| Deployment currency | **Current — production equals repo HEAD** | Two independent proofs |
| Domain path | Cloudflare proxy → Vercel origin (`iad1`) | `Server: cloudflare` + `x-vercel-id` |
| Deployment protection | Password / SSO / trusted-IP all **off** | Vercel project settings |
| Client env | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` present | `/` renders landing, not the backend hard-stop |

**There is no deployment problem, and there never was.** Any future "the site looks
unchanged" report must start from this section, not from a deploy investigation.

### 2.2 Repository layout (actual, not aspirational)

| Fact | Value |
|------|-------|
| Package | `1.1.0` · release `Beta-1A` · codename Suite Genesis |
| Stack | Vite 6 + React 18 + TypeScript 5.6 strict SPA/PWA; Tailwind 3; npm; Node 20+ |
| Web root | `src/` (single root — **not** moved to `apps/web`) |
| Extracted packages | `packages/domain`, `packages/data`, `packages/processing` — wired by **tsconfig/Vite path aliases** |
| npm workspaces | **Not configured** — `package.json` has no `workspaces` key. Stage A landed; **Stage B did not** |
| Desktop | `apps/desktop/src-tauri` — Tauri 2 present (Windows/macOS/Linux targets) |
| Android | root `android/` — Capacitor 8, `appId: cloud.vybz.app` |
| iOS | `ios/App` — Capacitor shell, SPM plugins, fastlane; **no distributed build** |
| Backend | Supabase `xixmneooyufbeftdfpcm` (us-west-1) |
| Media origin | Supabase Storage only; Bunny Edge dormant |
| Live | LiveKit · Payments Stripe `acct_1TwTEtAnnpt9OYZI` · Email Resend `@vybz.cloud` |
| Correctness gate | `npm run lint` · `npm run test` · `npm run build` · `npm run test:e2e` |
| Tag `Beta-1A` | **Must not be cut** until the delivery gates in §22 pass |

### 2.3 Delivery truth (the actual problem)

| Finding | Detail |
|---------|--------|
| **Public entry surface** | `LandingPage.tsx` contains exactly four links: `/enter`, `/legal/terms`, `/legal/privacy`, `#waitlist`. **Nothing links to any Suite feature.** |
| **Anonymous fallback is silent** | Any unlisted path renders the landing page at HTTP 200 **without changing the URL**. `/settings/costs` looks like a marketing page, not a login wall. |
| **Suite is reachable but undiscoverable** | Prepare, Credits, Distribution, MasterReady and the Collab panels all work in production, anonymously, with no account — and cannot be found without being handed the URL. |
| **Placeholder nav** | 7 of 14 `nav: true` routes (`/credits`, `/master`, `/coverlab`, `/sentinel`, `/relay`, `/wallet`, `/settings`) render a "Suite placeholder" empty state. |
| **Test fixtures exposed** | Five `/__e2e__/*` routes bypassed authentication and served seeded fake data to the public internet. **Fixed 2026-08-01 (D1)** — compiled out behind `VITE_E2E_FIXTURES`, guarded by `npm run check:no-fixtures`. Ships on the next deploy. |
| **Native undistributed** | Zero desktop installers, zero Play listings, zero TestFlight builds have reached a user. |
| **Polish invisibility** | PRs #22–#29 = 17 files, +117/−97 lines of pure class substitution. Exactly one artifact (`favicon.svg`) is visible to an anonymous visitor. |

### 2.4 Resolved numbering collision (important)

v1 §21 named **product tracks** by number (5 CoverLab, 6 Sentinel, 7 Relay). Execution
then used the same numbers for **different work** (5 Desktop Alpha, 6 Android Alpha,
7 Sync & Collaboration). The collision is still visible in production: placeholder
pages say *"Phase 6 — Sentinel"* while shipped Phase 6 was Android Alpha.

**Resolution, binding from v2 onward:**

- **Execution phases keep integers** (0, 1, 1.5, 2 … 19, 20 …). The ledger in §21 is
  the only authority for what an integer means.
- **Product tracks use names, never numbers** — CoverLab, Sentinel, Relay, Market,
  Artist, Live.
- Placeholder `phaseNote` strings in `src/app/suitePlaceholderRoutes.tsx` carry stale
  numbers and must be corrected to track names.

### 2.5 Assumptions still requiring validation

- Authenticated production experience — **never observed**. Every claim about the
  signed-in shell is code-derived. This is the single largest evidence gap.
- Android store readiness (project exists; listing not verified).
- npm workspaces vs pnpm for Stage B (default: **keep npm**).
- Remote job-runner maturity beyond current Edge functions.
- Desktop code-signing identity; Apple Developer membership (deferred, OR-012).

---

## 3. Product-suite definition

| Product | Function | Accent | Delivery state (2026-07-31) |
|---------|----------|--------|------------------------------|
| **VYBZ Home** | Project, release, and audience command center | Cyan | `DEPLOYED BUT UNVERIFIED` (authed) |
| **VYBZ Studio** | Music Repos, versions, branches, collaboration | Orange | `DEPLOYED BUT UNVERIFIED` (authed; `/studio` redirects to legacy `/projects`) |
| **VYBZ Prepare** | Distribution-readiness workspace | Ice cyan | `DELIVERED AND PRODUCTION-VERIFIED` — but undiscoverable |
| **VYBZ Credits** | Metadata, contributors, splits, approvals | Indigo | `DELIVERED AND PRODUCTION-VERIFIED` — but undiscoverable |
| **VYBZ MasterReady** | Audio analysis, mastering, deliverables | Amber / green | `PARTIALLY IMPLEMENTED` — page verified, job path untested |
| **VYBZ CoverLab** | Artwork analysis, repair, visual delivery | Magenta / violet | `STUB OR SCAFFOLD` — placeholder page only |
| **VYBZ Sentinel** | Secure prerelease sharing, watermarking, provenance | Red | `STUB OR SCAFFOLD` — placeholder page; watermark EFs exist |
| **VYBZ Relay** | Distribution package delivery and status | Blue / green | `STUB OR SCAFFOLD` — placeholder; readiness report lives on the release |
| **VYBZ Live** | Performances, sessions, listening events | Crimson | `DEPLOYED BUT UNVERIFIED` (authed) |
| **VYBZ Market** | Sample packs and digital music products | Violet / gold | `PARTIALLY IMPLEMENTED` — public pack shell live, no live packs |
| **VYBZ Artist** | Public storefront, catalog, support | Brand cyan | `DEPLOYED BUT UNVERIFIED` (authed) |
| **VDock** | Persistent playback, queue, credits, support | Shared | `DEPLOYED BUT UNVERIFIED` (authed) |

Shared kernel: identity, Release Projects, Findings, Processing Jobs, storage, billing,
permissions, notifications, audit, cost control, design primitives, search, a11y,
**Platform Bridge**.

### Required product terminology

| Term | Meaning |
|------|---------|
| **VYBZ** | Overall artist/producer platform suite |
| **VYBZ Cloud** | Web application and cloud-access experience |
| **VYBZ Desktop** | Desktop workstation client (Tauri) |
| **VYBZ Mobile** | Mobile-client family |
| **VYBZ for Android** | Initial Android release |
| **VYBZ Platform Services** | Shared backend and processing infrastructure |
| **Release Project** | Shared cross-device project entity |
| **Finding** | Structured issue, warning, recommendation, or validation result |
| **Processing Job** | Local or remote operation with tracked lifecycle |
| **Platform Bridge** | Shared interface for platform-specific behavior |
| **VYBZ Engine** | Local watch/sync companion (`tools/vybz-bridge`) — **not** the Platform Bridge |

Do not invent alternate brand names that fragment the suite.

---

## 4. Architecture principles

1. **One product core** — domain logic shared; shells adapt composition.
2. **One account / one database / one storage origin** — Supabase Auth + Postgres + Storage.
3. **Untrusted clients** — native packaging does not secure secrets; RLS + Edge + workers remain the privilege boundary.
4. **No scattered platform checks** — use Platform Bridge; domain must not import Tauri/Capacitor/browser globals.
5. **Three-level processing** — portable · native desktop · remote jobs.
6. **Cost-first** — prefer local/portable; remote paid only with estimate + reservation; no auto-purchase of vendors.
7. **Incremental migration** — extract packages when ownership is clear; keep temporary adapters; plan rollback.
8. **Additive migrations only** — no DB reset; no second auth system.
9. **No Bunny reintroduction** as media origin; LiveKit for live.
10. **AI assists, humans approve** rights, splits, distribution, payments.
11. **No ads / anonymity / connection paywalls / pay-to-win / paid safety.**
12. **Dating / Spark-home / Living Home / VR stay frozen.**
13. **Vc** for tips/cosmetics/community — not to obscure dollar prices of professional processing.
14. **Platform readiness before feature lock-in.**
15. **Delivery integrity (new in v2)** — a capability is not finished until a real
    person can find it, reach it, and use it in production. Navigation, entry points,
    and production verification are engineering deliverables, not follow-up chores.
16. **Production is the source of truth about the product (new in v2)** — the
    repository is the source of truth about the code. When they disagree about what a
    user experiences, production wins and the docs are wrong.

### Explicit non-goals (architecture mistakes to prevent)

- Three independent repos with duplicated feature logic
- React Native rewrite without proven necessity
- Separate DBs or storage silos per client
- Shipping service_role / admin / billing / AI secrets in any client
- Full offline collaboration before reliable sync
- Heavy Android battery-hostile processing
- Cloud for every trivial scan; local for credential-bound AI
- Premature platform commitments delaying the ones already started
- Destructive single-commit monorepo rewrite
- Declaring native "done" because a webview opens
- **Declaring a phase done because CI was green (new in v2)**
- **Shipping routes that exist only for tests (new in v2)**
- **Counting token/CSS refactors as user-visible improvement (new in v2)**

---

## 5. Multi-platform topology

```text
                         VYBZ PLATFORM SERVICES

       Authentication · PostgreSQL · Storage · Realtime · Functions
          Processing Jobs · Entitlements · Notifications · Billing
                              │
        ┌───────────────┬─────┴─────┬───────────────┐
        │               │           │               │
   VYBZ Cloud     VYBZ Desktop   VYBZ Android    VYBZ iOS
   Vite + React      Tauri 2      Capacitor      Capacitor
  (canonical web)  (Win/mac/Lin)  (built)      (shell only)
```

Every client uses the same authoritative backend for: identities, profiles, artist
identities, orgs/teams (when shipped), Release Projects, metadata, audio/artwork,
Findings, reports, comments, collaborators, activity, notifications, job states,
exports, subscriptions, entitlements, Vc where applicable, billing, audit, and
device-independent preferences.

**Platform-specific local state** (caches, queues, drafts, native paths) must never
become an undocumented competing source of truth.

**Shell reality check:** only VYBZ Cloud has users. Desktop, Android, and iOS have code
and CI but no distribution. Treat them as `NATIVE-PLATFORM ONLY` until an installer,
an APK/AAB, or a TestFlight build reaches a human.

---

## 6. Repository and package architecture

### Target structure (aspirational — staged)

```text
vybz/
├── apps/
│   ├── web/
│   ├── desktop/          # EXISTS — src-tauri
│   └── android/
├── packages/
│   ├── app/
│   ├── ui/
│   ├── domain/           # EXISTS
│   ├── data/             # EXISTS
│   ├── platform/
│   ├── processing/       # EXISTS
│   ├── contracts/
│   ├── configuration/
│   └── testing/
├── supabase/
├── docs/
├── tooling/
└── scripts/
```

### Staged extraction — actual progress

| Stage | Action | Status | Rollback |
|------:|--------|--------|----------|
| A | `packages/{domain,data,processing}` + `src/platform/bridge` via path aliases | **Done** | Delete dirs; restore relative imports |
| B | npm workspaces without moving web root | **Not done** — no `workspaces` key in `package.json` | Revert workspace config |
| C | Extract `packages/ui` from `src/components/ui` | Not started | Path aliases back to `src/` |
| D | `apps/desktop` Tauri shell consuming shared build | **Done** | Remove Tauri app; web unchanged |
| E | Relocate Capacitor android under `apps/android` | Not started — root `android/` still authoritative | Keep root `android/` |
| F | Move web into `apps/web` | Not started — **highest risk**, exit gate requires green CI | — |

Stages C, E, and F are **not** priorities. They deliver zero user value and carry real
regression risk. Do not schedule them ahead of §23 delivery work.

### Dependency direction

```text
UI / app features
        ↓
Domain services and use cases
        ↓
Data repositories and processing contracts
        ↓
Platform adapters and infrastructure
```

Forbidden: domain → Tauri/Capacitor/DOM; circular package deps.

### Import conventions

`@vybz/domain`, `@vybz/data`, `@vybz/processing` resolve through tsconfig/Vite aliases
today. `@vybz/contracts`, `@vybz/platform`, `@vybz/ui` remain targets.

### Build commands

```bash
npm run dev            # http://localhost:5173
npm run lint           # tsc --noEmit
npm run test
npm run test:e2e
npm run build
```

Multi-client scripts live in `package.json`; see the desktop and Android release docs.
**Package manager decision (final for now): remain on npm.**

---

## 7. Shared accounts and backend

### Final decisions

- Supabase Auth remains authoritative identity.
- Same account across every client; stable user IDs.
- Existing users need no re-registration; projects appear after sign-in.
- Entitlements calculated **server-side**; clients never grant privileged access alone.
- No client may contain service_role, Stripe secret, Resend key, fal/Groq keys, signing
  secrets, or encryption master keys.

### Session persistence

| Client | Persistence |
|--------|-------------|
| Cloud | Supabase browser session storage |
| Desktop | Encrypted native store via Tauri (`secure_store.rs`) |
| Android | Keystore-backed preferences (`VybzSecureStorePlugin`) |
| iOS | Keychain-sealed preferences (`VybzSecureStorePlugin`, Swift) |

Logout clears platform credentials. Account deletion propagates via Platform Services.

### Deep links / callbacks

Handle: OAuth, magic link, password recovery, email verification, invitation acceptance,
open Release Project, open Finding, open Processing Job result.

Prefer **domain-based app links** (`vybz.cloud` / verified Android App Links / Universal
Links). Custom `vybz://` only where necessary. Define recovery when the app is not
installed or the link opens on the wrong device (web fallback).

> **Open item:** `public/.well-known/apple-app-site-association` still contains the
> placeholder `TEAMID`. Universal Links cannot work until a real Apple Team ID replaces
> it. Parked with OR-012.

Details: [`docs/architecture/AUTH_AND_DEEPLINKS.md`](./docs/architecture/AUTH_AND_DEEPLINKS.md).

### Database / security (multi-client)

- RLS on all user-accessible tables
- Ownership + collaboration policies
- Server-side entitlement checks
- Storage policies; signed/scoped uploads where required
- Idempotent mutations; audit fields; timestamps; soft delete where justified
- Migration rollback planning; generated types; schema compatibility tests
- **Every client is untrusted**

Migration-history formalisation (`db push` vs raw SQL + CI checksum guard) remains open
as **OR-010**.

---

## 8. Platform Bridge

Shared code must **not** scatter `if (isAndroid) / else if (isTauri)`.

### Contract (canonical shape)

```ts
export interface PlatformBridge {
  readonly kind: "web" | "desktop" | "android" | "ios";

  files: {
    selectAudio(): Promise<SelectedFile[]>;
    selectArtwork(): Promise<SelectedFile[]>;
    selectFolder?(): Promise<SelectedFolder | null>;
    saveExport(file: ExportedFile): Promise<void>;
    revealFile?(path: string): Promise<void>;
  };

  auth: {
    persistSession(session: PersistedSession): Promise<void>;
    restoreSession(): Promise<PersistedSession | null>;
    clearSession(): Promise<void>;
  };

  processing: {
    getCapabilities(): Promise<ProcessingCapabilities>;
    analyzeAudio(input: AudioInput): Promise<JobReference>;
    analyzeArtwork(input: ArtworkInput): Promise<JobReference>;
    cancelJob(jobId: string): Promise<void>;
  };

  notifications: {
    requestPermission(): Promise<boolean>;
    show(notification: VybzNotification): Promise<void>;
  };

  system: {
    openExternalUrl(url: string): Promise<void>;
    getDeviceInfo(): Promise<DeviceInformation>;
    getNetworkState(): Promise<NetworkState>;
  };

  sharing?: {
    receiveSharedFiles(): Promise<SharedImport[]>;
    shareExport(file: ExportedFile): Promise<void>;
  };
}
```

### Implementations (actual locations)

| Impl | Location |
|------|----------|
| Browser | `src/platform/bridge/web.ts` |
| Tauri | `src/platform/bridge/desktop.ts` + `tauriInvoke.ts` |
| Capacitor Android | `src/platform/bridge/android.ts` |
| Capacitor iOS | `src/platform/bridge/ios.ts` |
| Detection / factory | `src/platform/bridge/detect.ts`, `createBridge.ts`, `capabilities.ts` |
| Contract tests | `src/platform/bridge/bridge.contract.test.ts` |

Must define: capability detection, graceful degradation, unsupported behavior,
permission-denied, error normalization, logging, cancellation, progress, mockability,
**contract tests**.

Spec: [`docs/architecture/PLATFORM_BRIDGE.md`](./docs/architecture/PLATFORM_BRIDGE.md).

---

## 9. Web requirements (VYBZ Cloud)

**Final:** continue the existing Vite + React SPA as the principal shared frontend.
No ground-up rewrite to support other platforms.

Cloud remains:

- Universally accessible client
- Public-facing product surface
- Fastest release channel
- Canonical browser implementation
- **A complete application**, not a marketing companion

Must continue: responsive desktop/tablet/mobile-browser layouts, browser file APIs, full
project access, public + account surfaces, a11y, progressive enhancement.

### 9.1 Entry-path requirements (new in v2 — binding)

The audit proved Cloud is currently *two disconnected applications*: a marketing page
and a Suite that the marketing page never mentions. The following are now product
requirements, not polish:

1. **Every shipped capability needs a named entry point.** Nav item, dashboard card,
   in-flow link, or an explicitly documented deliberate exception with an owner.
2. **The landing page must lead somewhere real.** At minimum, a visitor must be able to
   reach the free readiness scan — the product's own primary CTA is *"Run a free
   readiness scan"*, and that scan works today with no account.
3. **Auth gates must look like auth gates.** Silently substituting the marketing page
   for a protected route at HTTP 200 is a bug. Show a sign-in prompt that preserves the
   intended destination.
4. **Placeholder routes must not occupy primary navigation.** Either point the nav entry
   at the real surface or remove it from `suiteNavRoutes()`.
5. **Test-only routes must never exist in a production build.** `/__e2e__/*` must be
   compiled out (build-time flag), not merely undocumented.

Distinguish **native** behavior from ordinary responsive web.

---

## 10. Desktop requirements (VYBZ Desktop)

**Final:** **Tauri 2**. Windows first; macOS DMG and Linux AppImage targets are built in
CI. Desktop packages the shared React app and exposes native capability through a
**controlled** bridge (Rust commands / plugins). Not a bare webview wrapper.

Supports: native file/folder pickers, DnD import, large local audio, batch
processing/metadata/artwork, background jobs, local cache, offline drafts, native
save/export, shortcuts, resizable panels, local waveform/analysis, native notifications,
secure session storage, signed updates, crash diagnostics, capability detection,
professional density layouts.

Conceptual layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ VYBZ · Project tabs                      Jobs · Sync · Profile │
├──────────────┬─────────────────────────────┬─────────────────┤
│ Suite tools  │ Main workspace              │ Inspector       │
│ Prepare …    │ Audio · metadata · artwork  │ Findings …      │
├──────────────┴─────────────────────────────┴─────────────────┤
│ Processing queue · Upload state · Local/cloud engine         │
└──────────────────────────────────────────────────────────────┘
```

**Delivery state: `NATIVE-PLATFORM ONLY`.** Installers are built in CI but none has been
distributed. Notarised DMG blocked on `MAC_CERT_BASE64` / `MAC_CERT_PWD`.

ADRs: [`ADR_DESKTOP_TAURI.md`](./docs/architecture/ADR_DESKTOP_TAURI.md),
[`ADR_DESKTOP_CROSS.md`](./docs/architecture/ADR_DESKTOP_CROSS.md).
Ops: [`DESKTOP_RELEASE.md`](./docs/operations/DESKTOP_RELEASE.md).

**Relationship to VYBZ Engine (`tools/vybz-bridge`):** Engine remains the local
watch/sync companion for Music Repos; Desktop may host or invoke Engine capabilities
over time. Do not conflate Engine with Platform Bridge.

---

## 11. Mobile requirements (Android and iOS)

**Final:** **Capacitor** wraps the shared React app. Do **not** prescribe React Native
unless a documented spike proves a required capability impossible or unacceptably
degraded.

Treat mobile as first-class — not "responsive web in a package."

Supports (built): document/audio/gallery import, share-into-VYBZ, App Links / Universal
Links, push foundation, upload queue with progress and retry, connectivity awareness,
background-safe uploads where permitted, secure session storage, mobile checklists /
metadata / Findings / jobs / collaboration, signed APK, AAB validation, flexible Play
updates.

Conceptual layout:

```text
┌───────────────────────────┐
│ Release name        Menu  │
├───────────────────────────┤
│ Focused tool content      │
├───────────────────────────┤
│ Home · Projects · Jobs · Me│
└───────────────────────────┘
```

| Platform | Delivery state | Blocker |
|----------|----------------|---------|
| Android | `NATIVE-PLATFORM ONLY` | No Play listing; internal track not published |
| iOS | `NATIVE-PLATFORM ONLY` | Apple Developer Program + signing secrets (**OR-012**, deferred by owner) |

ADRs: [`ADR_ANDROID_CAPACITOR.md`](./docs/architecture/ADR_ANDROID_CAPACITOR.md),
[`ADR_IOS_ALPHA.md`](./docs/architecture/ADR_IOS_ALPHA.md).
Ops: [`ANDROID_RELEASE.md`](./docs/operations/ANDROID_RELEASE.md),
[`IOS_RELEASE.md`](./docs/operations/IOS_RELEASE.md).

---

## 12. Processing architecture (three levels)

### 12.1 Shared portable processing

Browser-compatible TS, Web Workers, Audio APIs, WASM where appropriate.

Suitable: identification, duration, codec/container, sample rate, bit depth, channels,
peaks, basic loudness, silence, filename validation, metadata extract, basic waveform,
preliminary readiness, artwork dimensions/aspect.

Must not block the UI thread. Runs on every capable client.

### 12.2 Native desktop processing

Tauri/native-assisted for: very large audio, batch analysis, high-res waveforms,
transcoding, conversion, batch artwork, local mastering prep, export packaging, offline
jobs, temp files, multi-core, long cancellable work.

Safe interface: allowlisted commands, path validation, process isolation, binary
management, progress events, cancel, timeouts, error mapping, temp cleanup, output
validation, version compatibility, **license review** for codecs/tools.

### 12.3 Remote processing

Trusted workers / Edge / server jobs for: protected credentials, server-grade
consistency, AI recommendations, distribution-specific validation, expensive analysis,
shared models, cross-client reproducibility.

Job lifecycle:

```text
queued → claimed → processing → succeeded | failed | canceled | expired
```

Every job includes: id, userId, projectId, inputs, processingVersion, status, progress,
attempts, created/started/completed, error, result ref, idempotency key, cancellation
state. Results attach to the shared Release Project.

Routing preference (cost):

```text
Portable client → Desktop native → VYBZ Engine → remote free → reserved paid
```

---

## 13. Storage and upload architecture

**Authoritative cloud-media origin:** Supabase Storage. No per-client silos.

Asset lifecycle:

```text
selected locally → locally inspected → upload queued → upload in progress
→ uploaded → validated → processing queued → processing → processed
→ attached to project → versioned or superseded
```

Account for: large audio, interrupted uploads, retries, duplicate detection, checksums,
type/MIME validation, size limits, quotas, ownership, temp state, orphan cleanup,
version replace, **local-path privacy**, cancel, cross-device visibility.

Buckets: `site-visuals`, `media-public`, `audio-assets`, `project-files`,
`storefront-previews`, `storefront-zips`, plus Music Repos blobs.

Site visuals CDN:
`https://xixmneooyufbeftdfpcm.supabase.co/storage/v1/object/public/site-visuals/`

---

## 14. Offline and synchronization strategy

**Realistic target** (not full offline collaboration):

- Cached project summaries and Findings
- Locally editable metadata drafts
- Pending uploads and mutations
- Last-known job states
- Retry queues
- Connectivity awareness + clear offline / unsynced indicators
- User-controlled cancel

Mutation queue shape:

```ts
type PendingMutation = {
  id: string;
  userId: string;
  projectId: string;
  operation: PendingOperation;
  payload: unknown;
  createdAt: string;
  attempts: number;
  idempotencyKey: string;
  baseVersion?: string;
};
```

Sync flow: detect connectivity → refresh session → revalidate access → resume uploads →
apply mutations idempotently → fetch server versions → detect conflicts → auto-merge safe
fields → present genuine conflicts → refresh caches → record outcome.

Conflict rules required for: independent fields, same-field edits, deleted projects,
removed collaborator access, replaced files, expired sessions, entitlement changes,
account suspension/deletion.

Implemented: `src/platform/sync/*` (mutation queue, field merge, reconnect),
`src/features/sync/SyncConflictPanel.tsx`, `src/platform/collab/*` (row-version merge).

Spec: [`docs/architecture/OFFLINE_AND_SYNC.md`](./docs/architecture/OFFLINE_AND_SYNC.md).

---

## 15. UI and responsive-composition strategy

Shared: design tokens, primitives, content language, feature behavior.
**Different composition per shell.**

| Shell | Composition rules |
|-------|-------------------|
| Desktop | Persistent suite nav, tabs, multi-panel, inspectors, dense tables, batch selection, keyboard, context menus, DnD, status/queues, window restore |
| Mobile | Bottom nav, single-column, full-screen tools, sheets, large targets, condensed editors, card Findings, discoverable gestures only, back button, safe areas, battery-conscious |
| Cloud | Responsive desktop + tablet + mobile browser; browser file UX; public surfaces |

`data-theme="smoke"` is the **default Suite Genesis dark theme** (tokens v2 /
`glass-vibrant`). It is not a legacy gray fallback and there is no separate "modern"
theme id. Do not "fix" it.

### 15.1 What counts as a UI improvement (new in v2)

Swapping a hard-coded hex for a token is **maintenance**, not improvement. It may be
worth doing, but it must be described as refactoring and must not be scheduled ahead of
work a user can perceive. Before opening a UI PR, answer:

- Which route renders this component?
- Can a signed-out visitor see it?
- What is the observable before/after difference?

If the answer to the last question is "the colour is imperceptibly different," the PR is
housekeeping. Batch it; do not celebrate it.

---

## 16. Security and privacy

### Multi-platform threat model (minimum)

Stolen sessions · compromised devices · malicious local files · path traversal ·
oversized/corrupt media · crafted metadata · unsafe native commands · command injection ·
symlink attacks · temp/cache leakage · unauthorized project access · removed
collaborators retaining cache · deep-link interception · OAuth abuse · push privacy ·
dependency compromise · update-channel compromise · signing-key compromise · malicious
processing outputs · AI/service_role exposure · webhook spoofing ·
**auth-bypassing test routes in production (observed 2026-07-31)**.

### Required controls

Least privilege · input/output validation · secure temp dirs · restricted Tauri
capabilities · CSP · no arbitrary shell/FS · allowlists · secure credential storage ·
TLS · RLS · audit logging · dependency review · signed updates · safe errors ·
user-controlled diagnostic consent ·
**build-time exclusion of all test fixtures and auth bypasses**.

**Resolved 2026-08-01 (Track D1).** `src/App.tsx` used to return five `/__e2e__/*`
fixture pages before any auth check, live on `vybz.cloud`. Fixtures now live in
`src/app/e2eFixtures.tsx` behind `VITE_E2E_FIXTURES`, which Vite folds to `false` in
ordinary builds so the module is tree-shaken out. `npm run check:no-fixtures` fails CI
if any fixture marker reappears in `dist/`; `npm run build:e2e` is the only entry point
that enables them, and it must never produce a deployed artifact.

See [`SECURITY.md`](./SECURITY.md).

---

## 17. Cost management

- Prefer existing infra, free/compatible OSS, local/portable processing
- Remote only where it adds genuine value
- Quotas, size limits, retention, orphan cleanup, cost telemetry, per-feature attribution
- Kill switches; env spending limits; degrade when a paid provider is unavailable
- Provider abstraction where financially justified
- Distinguish: free local dev · free-tier deploy · low-volume prod · scaling · unavoidable
  paid (signing, store accounts, high-volume compute)
- **No automated purchase / subscribe / upgrade without owner authorization**

Cost Sentinel (`/settings/costs`) and AI-minute billing (`/settings/credits`) are built
and deployed but have **never been exercised in production**. Neither has a navigation
entry.

**Known paid dependencies currently deferred by the owner:** Apple Developer Program
(~$99/yr, OR-012); macOS signing certificates; GitHub Actions minutes for macOS runners.

---

## 18. Testing strategy

### Shared

Domain unit · schema · repository contracts · Platform Bridge contracts · processing
results · idempotency · permissions · offline queue · conflict resolution.

### Web

Components · browser integration · e2e smoke · upload · auth callbacks · responsive.

### Desktop

Tauri commands · pickers · DnD · path validation · local processing · installer smoke ·
updates · window restore · secure storage.

### Mobile

Capacitor plugins · document picker · gallery · App Links / Universal Links · back button ·
offline · upload interrupt · bg/fg · permission denial · low storage · rotation · APK
smoke · AAB validation.

### Processing

Golden files for format/loudness/peak/silence/artwork/metadata/findings/errors/corrupt/
large inputs. Git-store only small licensed fixtures; generate large fixtures in CI.

### Production verification (new in v2 — mandatory tier)

Unit and e2e tests prove the code behaves. They do **not** prove a user can reach it.
After every production deploy that claims user-facing change:

1. Load the affected route on `https://vybz.cloud` in a real browser.
2. Do it **signed out first**, then signed in.
3. Capture a screenshot and record it against the phase or PR.
4. If the route is not reachable by navigation, the phase is not complete — file the
   gap, do not tag it.

E2E fixtures must run against a preview build, never depend on production routes.

---

## 19. CI/CD

```text
Shared validation
  ├── TypeScript · Lint · Unit
  ├── Web build
  ├── Desktop build (windows-msi · mac-dmg · linux-appimage)
  ├── Android debug/release build
  ├── iOS build (unsigned stub until OR-012)
  ├── Migration tests
  └── Cross-platform contract tests
```

Secure release automation: PR validation · main validation · tagged/preview/prod releases ·
artifact retention · provenance · checksums · dependency audit · secret handling ·
signing-key isolation · env promotion · migration gates · rollback · release notes ·
**version sync across clients**.

Untrusted PRs must not access production signing secrets. Do not name unsigned artifacts
as production-ready. Deployment to Vercel is via native Git integration — **no workflow
deploys**; `ci.yml` only validates.

Operational note: GitHub Actions billing limits have silently produced "no runner
assigned" failures. If jobs fail instantly with no runner, check billing before
debugging workflows.

---

## 20. Distribution

### Web

Vercel `astramatrix/vybz` ← GitHub `main`, auto-deploy on merge. Aliases include
`vybz.cloud` and `www.vybz.cloud` behind Cloudflare. Env validation · migration
validation · error monitoring · rollback via Vercel promote.

### Desktop

Windows app identity · code signing · installer · update manifests (`windows/`,
`darwin/`, `linux/`) · stable/preview channels · rollback · release notes · AV
false-positive handling · crash-report consent · binary license inventory.

### Mobile

Application ID `cloud.vybz.app` · signing keys + custody · APK · AAB · internal/closed
testing · store listing · privacy / data-safety · deep-link verification · staged
rollout · rollback. iOS adds TestFlight, AASA Team ID, and ASC API keys.

---

## 21. Phase ledger — what actually happened

Integers below are **execution phases**. They are the only meaning these numbers carry
(see §2.4). Delivery states are from the 2026-07-31 audit.

| Phase | Name | Merged | Tag | Delivery state |
|------:|------|--------|-----|----------------|
| 0 | Suite Genesis doctrine | — | — | `DOCUMENTED ONLY` (by design) |
| 1 | Engineering + design foundation | — | — | `INFRASTRUCTURE ONLY` |
| 1.1 | Playwright hardening | — | — | `INFRASTRUCTURE ONLY` |
| 1.5 | Platform readiness | — | — | `INFRASTRUCTURE ONLY` |
| 2 | Prepare MVP | PR #1 | `…-phase2` | **`DELIVERED AND PRODUCTION-VERIFIED`** — undiscoverable |
| 3 | Credits + metadata | PR #2 | `…-phase3` | **`DELIVERED AND PRODUCTION-VERIFIED`** — undiscoverable |
| 4 | Processing Engine | PR #3 | `…-phase4` | `PARTIALLY IMPLEMENTED` |
| 5 | Desktop Alpha | PR #4 | `…-phase5` | `NATIVE-PLATFORM ONLY` |
| 6 | Android Alpha | PR #5 | `…-phase6` | `NATIVE-PLATFORM ONLY` |
| 7 | Sync & Collaboration | PR #6 | `…-phase7` | `IMPLEMENTED BUT NOT DELIVERED` |
| 8 | Distribution Readiness | PR #7 | `…-phase8` | **`DELIVERED AND PRODUCTION-VERIFIED`** — undiscoverable |
| 9 | Polish & Visual | PR #8 | `…-phase9` | `DEPLOYED BUT UNVERIFIED` |
| 10 | Storefront + platform checkout | PR #11 | `…-phase10`, `…-phase10-platform` | `PARTIALLY IMPLEMENTED` |
| 11 | Perf + Premium UI | PR #12 | `…-phase11` | `DEPLOYED BUT UNVERIFIED` |
| 12 | Desktop Beta | PR #13 | `…-phase12` | `NATIVE-PLATFORM ONLY` |
| 13 | Android Beta | PR #14 | `…-phase13` | `NATIVE-PLATFORM ONLY` |
| 14 | Cost Sentinel | PR #15 | `…-phase14` | `IMPLEMENTED BUT NOT DELIVERED` |
| 15 | Remote AI Processing | PR #16 | `…-phase15` | `PARTIALLY IMPLEMENTED` |
| 16 | Collaboration Sessions | PR #17 | `…-phase16` | `PARTIALLY IMPLEMENTED` |
| 17 | Desktop macOS & Linux | PR #18 | `…-phase17` | `NATIVE-PLATFORM ONLY` |
| 18 | Cost-Minute Billing | PR #19 | `…-phase18` | `IMPLEMENTED BUT NOT DELIVERED` |
| 19 | iOS Alpha | PR #21 | `…-phase19` (`617735e6`) | `NATIVE-PLATFORM ONLY` |
| — | UI polish sweep (#22–#27, #29) | 7 PRs | none | `DEPLOYED BUT UNVERIFIED` — 17 files, +117/−97, one anonymous-visible artifact |

Tag prefix throughout: `v1.1.0-beta1A-`. Repo HEAD at audit: `a84d984a`.

### Effort distribution (the uncomfortable summary)

Of eighteen execution phases, **six** (5, 6, 12, 13, 17, 19) went primarily to native
shells that have shipped zero installers to zero users. Phase 17 changed 12 native files
and 1 web file. Phase 19 changed 26 native files and produced no distributable build.
Meanwhile the landing page — the only surface every visitor sees, and the sole entry to
the funnel — **was not touched in any of the eighteen phases**.

This is recorded so it is not repeated, not to relitigate it. The architecture built
during those phases is sound and reusable.

---

## 22. Delivery integrity gate (mandatory for every future phase)

This gate is **in addition to** each phase's own exit gate. A phase may not be marked
complete, tagged, or recorded in `CHANGELOG.md` until every box is checked with
evidence.

- [ ] **Route registered** — the feature has a path in `src/App.tsx` or
      `suitePlaceholderRoutes.tsx`, and it is not a placeholder.
- [ ] **Entry point exists** — a named nav item, dashboard card, or in-flow link leads
      to it. If deliberately hidden, the exception is written down with an owner and a
      reason.
- [ ] **Auth level is intentional** — public, authed, or role-gated by decision, not by
      accident. Protected routes show a real sign-in prompt.
- [ ] **No test-only surface** — nothing under `/__e2e__/` or equivalent is in the
      production bundle.
- [ ] **Deployed and fingerprinted** — the Vercel production deployment SHA equals the
      merge commit, and a feature-specific string is present in the served bundle.
- [ ] **Production-verified signed out** — loaded on `vybz.cloud`, screenshot recorded.
- [ ] **Production-verified signed in** — primary flow exercised, screenshot recorded.
- [ ] **Delivery state declared** — one of the §0 statuses, written into the exit gate
      and `AGENTS.md`.
- [ ] **User-visible difference stated in one sentence** — if it cannot be stated, the
      phase is infrastructure and must be labelled as such.

### Correctness gate (unchanged)

`npm run lint` && `npm run test` && `npm run build`; E2E `npm run test:e2e`.

---

## 23. Forward roadmap

**Development of new phases is paused** until Track D completes. This is a deliberate
stop, not a backlog reshuffle.

### Track D — Delivery correction (do this first)

Small, independent, reversible. No new features.

| # | Work | Why | Size |
|--:|------|-----|------|
| ~~**D1**~~ | ~~Remove `/__e2e__/*` from production builds (build-flag gate)~~ **Done 2026-08-01** — `VITE_E2E_FIXTURES` + `check:no-fixtures` CI guard | Security defect — auth bypass live on the public internet | XS |
| **D2** | Link the landing page to the free readiness scan (`/releases`) | Prepare works, is free, needs no account, and nobody can find it | XS |
| **D3** | Replace the silent landing-page fallback for protected routes with a real sign-in prompt that preserves the destination | `/settings/costs` currently impersonates a marketing page | S |
| **D4** | Resolve the 7 placeholder nav entries — repoint or remove | Half the nav says "reserved for the VYBZ Suite" | S |
| **D5** | Correct stale `phaseNote` strings to product-track names (§2.4) | Production text cites the wrong phases | XS |
| **D6** | First authenticated production verification pass; record screenshots | The entire signed-in experience is unobserved | S |
| **D7** | Give Cost Sentinel and AI credits a discoverable entry from `/settings` | Two shipped phases nobody can reach | XS |
| **D8** | Delete unused `suite-accent-wash-cyan` from `src/index.css` | Dead code from PR #24 | XS |

**Track D exit gate:** an ordinary visitor arriving at `https://vybz.cloud` with no
account and no instructions can reach the free readiness scan, complete it, and see
Findings — verified by screenshot. No `/__e2e__/` route resolves in production.

### Track E — Earn the Beta-1A tag

Only after Track D. Gate for cutting `Beta-1A`:

1. Track D exit gate passed.
2. Authenticated smoke of the audience loop: Enter → upload → VDock play → tip Vc →
   brief live session.
3. `site-visuals` CDN confirmed serving.
4. AI-credit Checkout exercised once on `/settings/credits`.
5. Every phase in §21 carries an evidence-backed delivery state.

### Track P — Product tracks (resume after D)

Named, never numbered. Prioritise by user value, not by architectural tidiness:

CoverLab · Sentinel · Relay · Market activation · Artist/VDock/Live unification ·
Automation and scale.

### Track N — Native distribution (owner-gated, do not block on it)

Android internal track → Play listing · Windows signed installer · notarised DMG
(`MAC_CERT_*`) · iOS TestFlight (**OR-012**, Apple Developer ~$99/yr) · AASA `TEAMID`.

### Explicitly not scheduled

Workspace Stages C/E/F · further token/CSS refactors · Spark/dating expansion · Living
Home · VR · Bunny reintroduction · React Native rewrite. Park ideas in the Opportunity
Register.

---

## 24. Documentation map and hygiene

| Document | Role |
|----------|------|
| `VYBZ_MASTERPLAN.md` | This file — supreme authority |
| `AGENTS.md` | Agent ops + pickup state; must never contradict §21/§23 |
| `ARCHITECTURE.md` | Platform map |
| `SECURITY.md` | Threat model + controls |
| `VERSIONING.md` | Labels and client version sync |
| `IDEAS_BACKLOG.md` | Opportunity Register (OR-###) |
| `CHANGELOG.md` | Release history — must state a delivery state per entry |
| `docs/DOCUMENTATION_MANIFEST.md` | Registry of all docs |
| `docs/architecture/PRODUCTION_REALITY_AUDIT_2026-07-31.md` | **Evidence baseline for v2** |
| `docs/architecture/PHASE*_EXIT_GATE.md` | Per-phase gates — retrofit delivery states when touched |
| `docs/architecture/ADR_*.md` | Decision records |
| `docs/operations/*_RELEASE.md` | Desktop / Android / iOS release procedures |
| `docs/archive/pre-suite-2026/` | Archived; never authoritative |

**Documentation hygiene rules (new in v2):**

1. A doc that states a status must state the evidence date.
2. If production contradicts a doc, the doc is wrong — fix the doc in the same session.
3. Never write "Complete" without a §0 delivery state beside it.
4. Aspirational structure must be labelled aspirational in the same table as the actual
   structure — v1 §6 caused real confusion by showing only the target.

---

## 25. Migration and compatibility strategy

| Concern | Strategy |
|---------|----------|
| Existing SPA routes/users | Backward compatible; SuiteShell wraps App |
| Capacitor `android/` | Keep root project until an `apps/android` cutover is proven |
| Auth sessions | Same Supabase project; platform storage adapters only |
| Storage paths | Unchanged buckets; clients upload to the same origins |
| Feature flags | `src/lib/flags.ts` — additive, reversible |
| Storefront | Isolated under Market |
| Music Repos + Engine | Preserve; Desktop integrates later without replacing CAS |
| DB | Additive only |
| Rollback | Feature flags + keep the web build path pristine |

### Preserve (do not rewrite from scratch)

| Concern | Anchor |
|---------|--------|
| Music Repos CAS | `src/lib/repoSync.ts`, `src/lib/api.ts`, migrations `0059`/`0060`, `src/components/repos/` |
| Local companion | `tools/vybz-bridge/` (VYBZ Engine) |
| Feature flags | `src/lib/flags.ts` |
| Watermark | `supabase/functions/watermark`, `watermark-detect`, `_shared/watermark.mjs` |
| Capacitor Android | `capacitor.config.ts`, `android/` |
| Suite shell / tokens | `src/shell/`, `src/design/`, `src/components/ui/`, `src/components/states/` |
| Platform layer | `src/platform/{bridge,jobs,costs,audit,orgs,sync,collab,cache,deeplinks,push}` |

### Key surface map

| Concern | Path |
|---------|------|
| Routing / auth gate | `src/App.tsx` (the auth gate is lines ~115–163 — read before changing routes) |
| Suite routes + placeholders | `src/app/routeManifest.ts`, `src/app/suitePlaceholderRoutes.tsx` |
| Shell | `src/shell/SuiteShell.tsx`, `PrimaryRail.tsx`, `MobileNav.tsx`, `CommandBar.tsx`, `ContextInspector.tsx` |
| Marketing landing | `src/pages/LandingPage.tsx` — **the only anonymous surface** |
| Signed-in hub | `src/pages/ProfilePage.tsx` (`/`) |
| Prepare | `src/features/prepare/` · `@vybz/domain/releases` · `@vybz/data/releases` |
| Credits | `src/features/credits/` · `/release/:id/credits` |
| Distribution | `src/features/distribution/` · `/release/:id/distribution` |
| Mastering / AI | `src/features/mastering/` · `/release/:id/master` |
| Collab | `src/features/collab/`, `src/platform/collab/` |
| Costs / billing | `src/features/costs/`, `src/platform/costs/` |
| Market packs | `src/features/storefront/` · `/tools/packs`, `/pack/:slug` |
| Site visuals CDN | `src/lib/siteVisuals.ts` |

### Edge functions and buckets

Preserve the existing set: `visual-generate`, `storefront-*`, `stripe-*`, `ai-topup`,
`ai-mastering`, `processing-enqueue`, `livekit-token`, `watermark*`, waitlist, audio-play.
Deploy JWT rules unchanged unless a phase doc says otherwise; `ai-topup` runs
`--no-verify-jwt` and verifies in-function.

Newest migrations: `20260730_0088_collab_sessions.sql`,
`20260730_0087_processing_ai.sql`, `20260728_0080_storefront_packs.sql`.

### Gotchas

- Large media is gitignored — serve from Storage.
- Bunny retired — never set `VITE_FEATURE_BUNNY_AUDIO=on`.
- VDock overlays mount via `OverlayPortal` on `document.body`.
- Desktop packaging ≠ secure secrets.
- Do not declare native apps done because a webview opens.
- Destructive monorepo moves are forbidden.
- Do not commit: `vizualz/`, `public/**/loop.{mp4,webm}`, `public/backdrop/*.{mp4,webm}`,
  `.agents/`, `skills-lock.json`, any `service_role` / `sbp_` tokens.

---

## 26. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| **Delivery illusion — shipping to a repo instead of to users** | §0 vocabulary + §22 gate; production verification is mandatory |
| **Doc drift restating fixed problems** | Evidence dates; production wins over docs |
| Monorepo thrash | Stages C/E/F unscheduled; CI green each stage |
| Capacitor limits | Documented spike required before any RN discussion |
| Secret leakage in native shells | Threat model; allowlists; secret scanning |
| Test surfaces reaching production | D1; build-flag exclusion; add a CI check |
| Offline complexity | Drafts-only first; no full collab offline |
| Cost blowup on remote jobs | Cost Sentinel; reservations; kill switches |
| Premature store submission | Track N gates |
| Agent mis-scope ("rewrite the frontend") | This blueprint + AGENTS hard laws |
| Owner-cost surprises | No purchase without explicit authorization; park in the Register |

---

## 27. Definition of completion

### Blueprint v2

- [x] One shared product core doctrine
- [x] One account / DB / storage architecture
- [x] Cloud + Desktop + Android + iOS shells defined
- [x] Platform Bridge mandated and implemented for four platforms
- [x] Three-level processing defined
- [x] Offline/sync realism defined and implemented
- [x] Phase ledger reconciled against production evidence
- [x] Delivery vocabulary and delivery integrity gate defined
- [ ] **Track D — delivery correction**
- [ ] Track E — Beta-1A tag earned
- [ ] Track N — native distribution to real users

### Product completion (north star)

> A VYBZ user owns one account, one creative identity, and one continuous body of work
> that follows them across browser, desktop, and mobile —
> **and can find all of it without being handed a URL.**

---

## Brand and copy (platform)

**Eyebrow:** The release operating system for independent music.
**Headline:** Everything between finished and released.
**Body:** Prepare, protect, credit, master, package and present your music from one
connected workspace — on web, desktop, or mobile.
**Primary CTA:** Start a release · **Secondary:** Run a free readiness scan
**Pricing:** Start free. Pay only when a release needs paid infrastructure or
professional processing.
**Brand principle:** *The platform provides precision. The artist provides expression.*

> Note: the secondary CTA describes a capability that already works in production for
> free, with no account. Track D2 exists to make the copy true in the interface.

---

## Future extensibility (non-blocking)

Architecture must not block future tablet layouts, shared native libs, plugins, local
models, team/org workspaces, or additional distribution providers — but **immediate
priority** is:

1. Correct the delivery gap (Track D)
2. Earn the Beta-1A tag (Track E)
3. Advance product tracks by user value (Track P)
4. Put native builds in real users' hands (Track N)

Nothing on this list is an architecture problem. The architecture is ahead of the
product; the product needs to catch up to its own front door.
