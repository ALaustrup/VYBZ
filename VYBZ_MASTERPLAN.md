# VYBZ Master Blueprint — Suite Genesis · Multi-Platform

> **Supreme product and architecture authority.** Conflict order: this file →
> `AGENTS.md` → `ARCHITECTURE.md` → `SECURITY.md` → `VERSIONING.md` →
> Opportunity Register → `CHANGELOG.md` → ops docs.
>
> Pre–Suite Music Hub doctrine: [`docs/archive/pre-suite-2026/`](./docs/archive/pre-suite-2026/)
> (never authoritative).
>
> This document is the **implementation-grade Master Blueprint Prompt** for
> autonomous agents continuing VYBZ across web, desktop, and Android.

| Field | Value |
|-------|--------|
| **Owner** | Astra Matrix, Inc. |
| **Product** | VYBZ |
| **Tagline** | Find Yours. |
| **Promise** | Everything between finished and released. |
| **Category** | Release operating system for independent music |
| **Generation** | Beta-1A (Suite Genesis) — planned; **untagged** until production gates |
| **Domain** | https://vybz.cloud |
| **Repository** | ALaustrup/VYBZ only |
| **Integration branch** | `main` (production) |
| **Suite branch** | `suite-genesis` (active doctrine + foundation) |
| **Clients** | VYBZ Cloud · VYBZ Desktop · VYBZ Mobile (Android first) |
| **Backend** | VYBZ Platform Services (one Supabase project) |

---

## 1. Executive vision

VYBZ is the infrastructure between a creative project and a commercially released,
protected, properly documented body of work. It is not merely a streaming platform,
distributor, mastering service, metadata editor, sample marketplace, file locker,
social network, or DAW — it connects those activities.

**Governing architectural principle:**

> One VYBZ product core, one shared cloud platform, and three platform-specific
> application shells.

| Surface | Role |
|---------|------|
| **VYBZ Cloud** | Browser SPA — universally accessible, public-facing, fastest release channel, complete product |
| **VYBZ Desktop** | Tauri 2 Windows-first workstation — native files, batch, local processing, dense professional UI |
| **VYBZ Mobile** | Capacitor Android-first client — touch workflows, import/share, push, mobile-safe sessions |
| **VYBZ Platform Services** | Shared Auth, Postgres+RLS, Storage, Realtime, Edge Functions, jobs, entitlements, billing, notifications |

A user owns **one account, one creative identity, and one continuous body of work**
that follows them across browser, desktop, and mobile. Clients must not become
three disconnected apps with duplicated business logic.

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

Legacy audience loop `upload → /u/:id → VDock → tip → live` remains the **final
third** (Artist / VDock / Live / Market), not the sole north star.

---

## 2. Current verified state

*Facts verified on `suite-genesis` at blueprint expansion. Do not invent missing artifacts.*

### Verified repository facts

| Fact | Evidence |
|------|----------|
| Branch | `suite-genesis` (local; not assumed pushed) |
| Package | `1.1.0` · `release: Beta-1A` · `codename: Suite Genesis` |
| Stack | Vite 6 + React 18 + TypeScript SPA/PWA; Tailwind; npm; Node 20+ |
| Layout | **Single-root** `src/` — no `apps/` or `packages/` workspace yet |
| Backend | Supabase project `xixmneooyufbeftdfpcm` (us-west-1) |
| Media origin | Supabase Storage only; Bunny Edge dormant |
| Live | LiveKit |
| Payments | Stripe `acct_1TwTEtAnnpt9OYZI` |
| Email | Resend `@vybz.cloud` |
| Capacitor | Deps `@capacitor/*` ^8.4 · `capacitor.config.ts` · `appId: cloud.vybz.app` · `android/` project present |
| Tauri | **Not present** (no `src-tauri/`) |
| Phase 0 | Complete — doctrine reset, inventories, Storage-only ops |
| Phase 1 | Complete — tokens, UI primitives, SuiteShell, Vitest/Playwright/CI, platform stubs |
| Phase 1.1 | Complete — deterministic Playwright preview runner |
| Phase 2 Prepare | **Not started** |
| Storefront / visual-generate | WIP may exist in working tree — keep isolated from foundation commits |
| Tests | `npm run lint` · `npm run test` · `npm run build` · `npm run test:e2e` |
| Tag `Beta-1A` | **Must not be cut** until shell + cost kernel + Prepare scan pass production gates |

### Authority conflict resolutions (final)

| Conflict | Authoritative direction |
|----------|-------------------------|
| Tip-loop-only vs Suite OS | **Suite OS**; tip loop = audience third |
| Bunny vs Storage | **Storage only**; do not re-enable Bunny as origin |
| Greenfield rewrite vs extend SPA | **Extend** existing React/Vite; no Next.js rewrite |
| React Native vs Capacitor | **Capacitor** unless spike proves impossibility |
| Desktop shell | **Tauri 2**, Windows first |
| Monorepo now | **Target** workspace; **incremental** extraction — no big-bang move |
| Bridge vs Platform Bridge | `tools/vybz-bridge` → **VYBZ Engine** (local companion); **Platform Bridge** = typed client capability API |
| Browser-only Phase 2+ | Insert **Phase 1.5 Platform Readiness** before Prepare feature logic hardens browser assumptions |

### Assumptions requiring validation

- Exact `android/` signing / store readiness (project exists; store listing not verified).
- Whether workspace tooling should be npm workspaces vs pnpm (default: **keep npm** unless spike proves otherwise).
- OVH worker / remote job runner maturity beyond stubs.
- Desktop code-signing identity and Apple/Linux timing (deferred).

---

## 3. Product-suite definition

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

Shared kernel: identity, Release Projects, Findings, Processing Jobs, storage,
billing, permissions, notifications, audit, cost control, design primitives,
search, a11y, **Platform Bridge**.

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

Do not invent alternate brand names that fragment the suite.

---

## 4. Architecture principles

1. **One product core** — domain logic shared; shells adapt composition.
2. **One account / one database / one storage origin** — Supabase Auth + Postgres + Storage.
3. **Untrusted clients** — desktop packaging does not secure secrets; RLS + Edge + workers remain the privilege boundary.
4. **No scattered platform checks** — use Platform Bridge; domain must not import Tauri/Capacitor/browser globals.
5. **Three-level processing** — portable · native desktop · remote jobs.
6. **Cost-first** — local/portable prefer; remote paid only with estimate + reservation; no auto-purchase of vendors.
7. **Incremental migration** — extract packages when ownership is clear; keep temporary adapters; plan rollback.
8. **Additive migrations only** — no DB reset; no second auth system.
9. **No Bunny reintroduction** as media origin; LiveKit for live.
10. **AI assists, humans approve** rights, splits, distribution, payments.
11. **No ads / anonymity / connection paywalls / pay-to-win / paid safety.**
12. **Dating / Spark-home / Living Home / VR stay frozen.**
13. **Vc** for tips/cosmetics/community — not to obscure dollar prices of professional processing.
14. **Platform readiness before feature lock-in** — Phase 1.5 before Prepare hardens browser-only paths.

### Explicit non-goals (architecture mistakes to prevent)

- Three independent repos with duplicated feature logic
- React Native rewrite without proven necessity
- Separate DBs or storage silos per client
- Shipping service_role / admin / billing / AI secrets in any client
- Full offline collaboration before reliable sync
- Heavy Android battery-hostile processing
- Cloud for every trivial scan; local for credential-bound AI
- Premature macOS/Linux/iOS commitments delaying Windows + Android
- Destructive single-commit monorepo rewrite
- Declaring native “done” because a webview opens

---

## 5. Multi-platform topology

```text
                         VYBZ PLATFORM SERVICES

       Authentication · PostgreSQL · Storage · Realtime · Functions
          Processing Jobs · Entitlements · Notifications · Billing
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
       VYBZ Cloud        VYBZ Desktop      VYBZ Mobile
       Vite + React         Tauri 2          Capacitor
       (canonical web)   (Windows first)   (Android first)
```

Every client uses the same authoritative backend for: identities, profiles,
artist/producer identities, orgs/teams (when shipped), Release Projects,
metadata, audio/artwork, Findings, reports, comments, collaborators, activity,
notifications, job states, exports, subscriptions, entitlements, Vc where
applicable, billing, audit, and device-independent preferences.

**Platform-specific local state** (caches, queues, drafts, native paths) must
never become an undocumented competing source of truth.

---

## 6. Repository and package architecture

### Target structure (aspirational — staged)

```text
vybz/
├── apps/
│   ├── web/
│   ├── desktop/
│   │   └── src-tauri/
│   └── android/          # Capacitor android project + thin shell
│       └── android/
├── packages/
│   ├── app/              # feature modules (prepare, credits, …)
│   ├── ui/               # design system primitives
│   ├── domain/           # use cases (no platform imports)
│   ├── data/             # repositories / Supabase adapters
│   ├── platform/         # PlatformBridge contracts + implementations
│   ├── processing/       # portable + contracts for native/remote
│   ├── contracts/        # shared types (Finding, Job, Release)
│   ├── configuration/
│   └── testing/
├── supabase/
├── docs/
├── tooling/              # includes evolution of tools/vybz-bridge → Engine
└── scripts/
```

### Verified today

Single-root SPA. Capacitor wraps `dist/` via `capacitor.config.ts` (`webDir: "dist"`).
Android project at repo `android/`. No Tauri. No npm workspaces.

### Staged extraction strategy

| Stage | Action | Rollback |
|------:|--------|----------|
| A | Introduce `packages/contracts` + `packages/platform` **in-tree** under `src/` first (`src/platform/bridge`, `src/domain`) | Delete new dirs; keep App working |
| B | Add npm workspaces without moving web root (optional dual package.json) | Revert workspace config |
| C | Extract `packages/ui` from `src/components/ui` | Path aliases back to `src/` |
| D | Add `apps/desktop` Tauri shell consuming shared build | Remove Tauri app; web unchanged |
| E | Relocate Capacitor android under `apps/android` only when scripts/CI updated | Keep root `android/` until cutover proven |
| F | Move web into `apps/web` last | Highest risk — exit gate requires green CI |

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

### Import conventions (target)

- `@vybz/contracts`, `@vybz/domain`, `@vybz/data`, `@vybz/platform`, `@vybz/ui`, `@vybz/processing`
- Until workspaces exist: path aliases in `tsconfig` / Vite pointing at `src/...`

### Build commands (target DX; exact scripts evolve in Phase 1.5)

```bash
npm run dev:web
npm run dev:desktop
npm run sync:android   # cap sync after web build

npm run typecheck
npm run lint
npm run test:shared
npm run test:web
npm run test:desktop
npm run test:android
npm run test:supabase

npm run build:web
npm run build:desktop:windows
npm run build:android:apk
npm run build:android:aab
```

**Package manager decision (final for now):** remain on **npm**. Do not casually switch.

---

## 7. Shared accounts and backend

### Final decisions

- Supabase Auth remains authoritative identity.
- Same account across Cloud / Desktop / Android; stable user IDs.
- Existing users need no re-registration; projects appear after sign-in.
- Entitlements calculated **server-side**; clients never grant privileged access alone.
- No client may contain service_role, Stripe secret, Resend key, fal/Groq keys, signing secrets, or encryption master keys.

### Session persistence

| Client | Persistence |
|--------|-------------|
| Cloud | Existing secure browser-compatible Supabase session storage |
| Desktop | Encrypted native credential/secret storage via Tauri plugins |
| Android | Android-backed secure credential storage (Capacitor Preferences + secure plugin as selected in Phase 1.5 spike) |

Logout clears platform credentials. Account deletion propagates via Platform Services.

### Deep links / callbacks

Handle: OAuth, magic link, password recovery, email verification, invitation
acceptance, open Release Project, open Finding, open Processing Job result.

Prefer **domain-based app links** (`vybz.cloud` / verified Android App Links).
Custom URI schemes only where necessary. Define recovery when app not installed
or link opens on wrong device (web fallback).

Details: [`docs/architecture/AUTH_AND_DEEPLINKS.md`](./docs/architecture/AUTH_AND_DEEPLINKS.md)
(created/expanded in Phase 1.5).

### Database / security (multi-client)

- RLS on all user-accessible tables
- Ownership + collaboration policies
- Server-side entitlement checks
- Storage policies; signed/scoped uploads where required
- Idempotent mutations; audit fields; timestamps; soft delete where justified
- Migration rollback planning; generated types; schema compatibility tests
- **Desktop is still an untrusted client**

---

## 8. Platform Bridge

Shared code must **not** scatter `if (isAndroid) / else if (isTauri)`.

### Contract (canonical shape — may refine without changing principle)

```ts
export interface PlatformBridge {
  readonly kind: "web" | "desktop" | "android";

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

### Implementations

| Impl | Location (target) |
|------|-------------------|
| Browser | `packages/platform/web` (initially `src/platform/bridge/web`) |
| Tauri | `packages/platform/desktop` |
| Capacitor | `packages/platform/android` |
| Test/mock | `packages/platform/test` |

Must define: capability detection, graceful degradation, unsupported behavior,
permission-denied, error normalization, logging, cancellation, progress,
mockability, **contract tests**.

Spec: [`docs/architecture/PLATFORM_BRIDGE.md`](./docs/architecture/PLATFORM_BRIDGE.md).

---

## 9. Web requirements (VYBZ Cloud)

**Final:** Continue existing Vite + React SPA as principal shared frontend foundation.
Do not prescribe a ground-up rewrite to support other platforms.

Cloud remains:

- Universally accessible client
- Public-facing product surface
- Fastest release channel
- Canonical browser implementation
- **A complete application**, not a marketing companion

Must continue: responsive desktop/tablet/mobile-browser layouts, browser file APIs,
full project access, public + account surfaces, a11y, progressive enhancement.

Distinguish **Android-native** behavior from ordinary responsive web.

---

## 10. Desktop requirements (VYBZ Desktop)

**Final:** **Tauri 2** preferred shell. Initial target **Windows**. Avoid barriers to
future macOS/Linux — but do not expand scope until Windows alpha exits.

Desktop packages the shared React app and exposes native capability through a
**controlled** bridge (Rust commands / plugins). Not a bare webview wrapper.

Must eventually support: native file/folder pickers, DnD import, large local audio,
batch processing/metadata/artwork, background jobs, local cache, offline drafts,
native save/export, multi-window where justified, shortcuts, context menus,
resizable panels, local waveform/analysis/conversion, Reveal in Explorer, native
notifications, secure session storage, signed updates, crash diagnostics,
capability detection, professional density layouts.

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

ADR: [`docs/architecture/ADR_DESKTOP_TAURI.md`](./docs/architecture/ADR_DESKTOP_TAURI.md).

**Relationship to VYBZ Engine (`tools/vybz-bridge`):** Engine remains the local
watch/sync companion for Music Repos; Desktop may **host or invoke** Engine
capabilities over time. Do not conflate Engine with Platform Bridge.

---

## 11. Android requirements (VYBZ for Android)

**Final:** **Capacitor** wraps the shared React app. Do **not** prescribe React Native
unless a documented spike proves a required capability impossible or unacceptably
degraded.

Treat Android as first-class — not “responsive web in a package.”

Must support (phased): document/audio/gallery import, camera artwork where useful,
share-into-VYBZ, App Links, push foundation, upload progress/retry, connectivity,
background-safe uploads where permitted, secure session, biometric re-entry where
appropriate, mobile checklists/metadata/Findings/jobs/collaboration, share/export,
signed APK for testing, signed AAB for store.

Adapt to touch, limited viewport, mobile storage, battery, background limits.

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

**Verified seed:** `capacitor.config.ts`, Capacitor 8 deps, `android/` Gradle project,
`appId: cloud.vybz.app`.

ADR: [`docs/architecture/ADR_ANDROID_CAPACITOR.md`](./docs/architecture/ADR_ANDROID_CAPACITOR.md).
Existing notes: [`docs/engineering/CAPACITOR.md`](./docs/engineering/CAPACITOR.md).

---

## 12. Processing architecture (three levels)

### 12.1 Shared portable processing

Browser-compatible TS, Web Workers, Audio APIs, WASM where appropriate.

Suitable: identification, duration, codec/container, sample rate, bit depth where
available, channels, peaks, basic loudness, silence, filename validation, metadata
extract, basic waveform, preliminary readiness, artwork dimensions/aspect.

Must not block UI thread. Runs on Cloud / Desktop / Android when capable.

### 12.2 Native desktop processing

Tauri/native-assisted for: very large audio, batch analysis, high-res waveforms,
transcoding, conversion, batch artwork, local mastering prep, export packaging,
offline jobs, temp files, multi-core, long cancellable work.

Safe interface: allowlisted commands, path validation, process isolation, binary
management, progress events, cancel, timeouts, error mapping, temp cleanup, output
validation, version compatibility, **license review** for codecs/tools.

### 12.3 Remote processing

Trusted workers / Edge / server jobs for: protected credentials, server-grade
consistency, AI recommendations, distribution-specific validation, expensive
analysis, shared models, cross-client reproducibility.

Job lifecycle:

```text
queued → claimed → processing → succeeded | failed | canceled | expired
```

Every job includes: id, userId, projectId, inputs, processingVersion, status,
progress, attempts, created/started/completed, error, result ref, idempotency key,
cancellation state. Results attach to the shared Release Project.

Routing preference (cost):

```text
Portable client → Desktop native → VYBZ Engine → remote free → reserved paid
```

---

## 13. Storage and upload architecture

**Authoritative cloud-media origin:** Supabase Storage (verified). No per-client silos.

Asset lifecycle:

```text
selected locally → locally inspected → upload queued → upload in progress
→ uploaded → validated → processing queued → processing → processed
→ attached to project → versioned or superseded
```

Account for: large audio, interrupted uploads, retries, duplicate detection,
checksums, type/MIME validation, size limits, quotas, ownership, temp state,
orphan cleanup, version replace, **local-path privacy**, cancel, cross-device visibility.

Existing buckets remain: `site-visuals`, `media-public`, `audio-assets`,
`project-files`, `storefront-previews`, `storefront-zips`, plus Music Repos blobs.

---

## 14. Offline and synchronization strategy

**Realistic first target** (not full offline collaboration):

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

Sync flow: detect connectivity → refresh session → revalidate access → resume
uploads → apply mutations idempotently → fetch server versions → detect conflicts
→ auto-merge safe fields → present genuine conflicts → refresh caches → record outcome.

Conflict rules required for: independent fields, same-field edits, deleted projects,
removed collaborator access, replaced files, expired sessions, entitlement changes,
account suspension/deletion.

Spec: [`docs/architecture/OFFLINE_AND_SYNC.md`](./docs/architecture/OFFLINE_AND_SYNC.md).

---

## 15. UI and responsive-composition strategy

Shared: design tokens, primitives, content language, feature behavior.
**Different composition per shell.**

| Shell | Composition rules |
|-------|-------------------|
| Desktop | Persistent suite nav, tabs, multi-panel, inspectors, dense tables, batch selection, keyboard, context menus, DnD, status/queues, window restore |
| Android | Bottom nav, single-column, full-screen tools, sheets, large targets, condensed editors, card Findings, discoverable gestures only, back button, safe areas, battery-conscious |
| Cloud | Responsive desktop + tablet + mobile browser; browser file UX; public surfaces |

Phase 1 SuiteShell / tokens / primitives are the shared visual foundation — extend,
do not replace, for platform modes.

---

## 16. Security and privacy

### Multi-platform threat model (minimum)

Stolen sessions · compromised devices · malicious local files · path traversal ·
oversized/corrupt media · crafted metadata · unsafe native commands · command
injection · symlink attacks · temp/cache leakage · unauthorized project access ·
removed collaborators retaining cache · deep-link interception · OAuth abuse ·
push privacy · dependency compromise · update-channel compromise · signing-key
compromise · malicious processing outputs · AI/service_role exposure · webhook spoofing.

### Required controls

Least privilege · input/output validation · secure temp dirs · restricted Tauri
capabilities · CSP · no arbitrary shell/FS · allowlists · secure credential storage ·
TLS · RLS · audit logging · dependency review · signed updates · safe errors ·
user-controlled diagnostic consent.

See [`SECURITY.md`](./SECURITY.md) (amended for multi-client).

---

## 17. Cost management

Preserve Suite cost doctrine; expand for multi-platform:

- Prefer existing infra, free/compatible OSS, local/portable processing
- Remote only where it adds genuine value
- Quotas, size limits, retention, orphan cleanup, cost telemetry, per-feature attribution
- Kill switches; env spending limits; degrade when paid provider unavailable
- Provider abstraction where financially justified
- Distinguish: free local dev · free-tier deploy · low-volume prod · scaling · unavoidable paid (signing, store accounts, high-volume compute)
- **No automated purchase/subscribe/upgrade** without owner authorization

---

## 18. Testing strategy

### Shared

Domain unit · schema · repository contracts · Platform Bridge contracts · processing
results · idempotency · permissions · offline queue · conflict resolution.

### Web

Components · browser integration · e2e smoke · upload · auth callbacks · responsive.

### Desktop

Tauri commands · pickers · DnD · path validation · local processing · installer smoke ·
updates · window restore · secure storage · Windows compatibility.

### Android

Capacitor plugins · document picker · gallery · App Links · back button · offline ·
upload interrupt · bg/fg · permission denial · low storage · rotation · APK smoke · AAB validation.

### Processing

Golden files for format/loudness/peak/silence/artwork/metadata/findings/errors/corrupt/
large inputs. Git-store only small licensed fixtures; generate large fixtures in CI.

---

## 19. CI/CD

```text
Shared validation
  ├── TypeScript · Lint · Unit
  ├── Web build
  ├── Desktop build (when present)
  ├── Android debug build (when gated)
  ├── Migration tests
  └── Cross-platform contract tests
```

Secure release automation: PR validation · main validation · tagged/preview/prod
releases · artifact retention · provenance · checksums · dependency audit · secret
handling · signing-key isolation · env promotion · migration gates · rollback ·
release notes · **version sync across clients**.

Untrusted PRs must not access production signing secrets. Do not name unsigned
artifacts as production-ready.

---

## 20. Distribution

### Web

Production deploy (Vercel today) · env validation · migration validation · error
monitoring · rollback.

### Desktop

Windows app identity · code signing · installer · update manifests · stable/preview
channels · rollback · release notes · AV false-positive handling · crash-report consent ·
binary license inventory.

### Android

Application ID (`cloud.vybz.app`) · signing keys + custody · APK · AAB · internal/
closed testing · store listing · privacy / data-safety · deep-link verification ·
staged rollout · rollback.

---

## 21. Phased roadmap

Phases **0** and **1** (incl. 1.1) are complete. Do not renumber them.
Insert **Phase 1.5** for platform readiness before Prepare hardens browser-only assumptions.
Prepare remains Phase **2**. Later suite phases stay **3–9**.

| Phase | Name | Status |
|------:|------|--------|
| **0** | Suite Genesis doctrine | **Complete** |
| **1** | Engineering + design foundation | **Complete** |
| **1.1** | Playwright / quality hardening | **Complete** |
| **1.5** | Platform readiness | **Complete** |
| **2** | Prepare MVP (shared domain) | **Complete** |
| **2.D** | Desktop Windows alpha (may overlap 2+) | Pending |
| **2.A** | Android alpha (may overlap 2+) | Pending |
| **3** | Credits + metadata | **Next** |
| **4** | MasterReady | Pending |
| **5** | CoverLab | Pending |
| **6** | Sentinel | Pending |
| **7** | Relay | Pending |
| **8** | Artist / VDock / Live / Market unification | Pending |
| **9** | Automation + scale | Pending |
| **P** | Processing-engine maturation (cross-cutting) | Parallel from 1.5–4 |
| **R** | Multi-platform distribution readiness | Before store/desktop public |

`Beta-1A` remains **untagged** until Cloud shell + cost kernel + Prepare scan pass
production gates; Desktop/Android alphas may ship as **unsigned/internal** builds earlier.

---

## 22. Phase specifications and exit gates

### Phase 0 — Suite Genesis doctrine (COMPLETE)

Purpose: reset product doctrine from Music Hub–only to release OS.  
Exit: no active doc contradicts Suite; inventories exist; Bunny-as-origin removed.  
Non-goals: feature code, monorepo move.

### Phase 1 — Engineering + design foundation (COMPLETE)

Purpose: tokens, UI primitives, SuiteShell placeholders, CI/unit/e2e stubs, job/cost/audit stubs.  
Exit: placeholders for suite products; lint/test/build/e2e green locally.  
Non-goals: Prepare schema, Tauri, monorepo.

### Phase 1.1 — Playwright hardening (COMPLETE)

Purpose: deterministic e2e preview lifecycle on Windows/CI.  
Exit: `npm run test:e2e` completes without hang.

---

### Phase 1.5 — Platform readiness (**NEXT**)

**Purpose:** Establish portability architecture without delaying all web development.

**Preconditions:** Phase 0–1.1 complete on `suite-genesis`.

**Workstreams:**

1. Workspace migration **plan** + ADR (execute Stage A–B only unless exit gate allows more)
2. Package boundaries documented; path aliases for domain/platform
3. `PlatformBridge` contract + Browser + Test implementations
4. Runtime capability registry
5. Secure-session / file-select / export abstractions (web complete; desktop/android stubs)
6. Deep-link route handler skeleton
7. Network-state provider
8. Local-cache + mutation-queue **contracts** (impl may be minimal in-memory)
9. Responsive shell **modes** (`web` | `desktop` | `android`) flags in SuiteShell
10. Platform error normalization
11. ADRs: Desktop Tauri, Android Capacitor (final decisions recorded)
12. Cross-platform test strategy + initial contract tests
13. Build-command conventions in package.json / docs
14. Tauri **proof of concept** (Windows load shared UI + one native command)
15. Capacitor **proof of concept** (existing android project: login shell smoke / bridge stub)

**Expected files/packages:**

- `src/platform/bridge/**` (or `packages/platform` if Stage B lands)
- `docs/architecture/PLATFORM_BRIDGE.md`, `ADR_DESKTOP_TAURI.md`, `ADR_ANDROID_CAPACITOR.md`
- `docs/architecture/AUTH_AND_DEEPLINKS.md`, `OFFLINE_AND_SYNC.md`
- `docs/architecture/REPO_WORKSPACE_PLAN.md`
- Updates: `ARCHITECTURE.md`, `AGENTS.md`, `docs/engineering/DEVELOPMENT.md`, `CAPACITOR.md`

**Database:** none required (optional: none).

**Platform:** web bridge production-quality; desktop/android stubs + PoC.

**Security:** no secrets in clients; Tauri capability allowlist in PoC; document threat deltas.

**Tests:** Platform Bridge contract tests; capability registry unit tests.

**Docs:** as above + CHANGELOG + DOCUMENTATION_MANIFEST.

**Automated checks:** `lint` · `test` · `build` · `test:e2e` remain green.

**Exit gate:**

- [ ] Bridge contract + web + mock impls mergeable
- [ ] No domain module imports Capacitor/Tauri directly
- [ ] ADRs accepted
- [ ] Tauri PoC boots shared UI on Windows OR documented blocker with mitigation
- [ ] Capacitor PoC uses existing `android/` + bridge stub
- [ ] AGENTS pickup points to Phase 2 with platform constraints
- [ ] Docs no longer describe VYBZ as browser-only

**Rollback:** remove Tauri app folder; leave Capacitor as before; delete bridge behind feature flag if needed.

**Non-goals:** Prepare schema; store submission; code signing; full offline; monorepo Stage F; macOS/iOS; React Native spike unless Capacitor PoC fails critically.

---

### Phase 2 — Prepare MVP (shared domain)

**Purpose:** Free distribution-readiness report for a Release Project, built on shared domain/data/processing contracts so Desktop/Android can consume the same logic.

**Preconditions:** Phase 1.5 exit gate (or explicit owner waiver for web-only interim with bridge adapters).

**Workstreams:** Release Project schema · track/artwork import via Bridge · portable readiness checks · Findings UI · no paid providers.

**Target packages (extract when ownership clear):**

```text
packages/domain/releases   (or src/domain/releases)
packages/data/releases
packages/app/prepare
packages/processing/readiness
packages/contracts/findings
```

**Database:** additive migrations for release projects, assets, findings, job refs as needed.

**Platform:** all Bridge file ops used; cloud Storage authoritative.

**Security:** RLS; no service_role in client; entitlement stubs server-side.

**Tests:** domain + findings schema + readiness golden fixtures (small).

**Exit gate:** signed-in user on Cloud can create Release Project, import audio/artwork, run free browser readiness scan, see Findings; results persisted and reloadable.

**Rollback:** migration down plan; feature flag `VITE_FEATURE_PREPARE`.

**Non-goals:** paid mastering; Relay delivery; full Credits passport; Desktop/Android feature parity (alphas are 2.D / 2.A).

---

### Phase 2.D — Desktop Windows alpha

**Purpose:** Professional workstation shell for Prepare-capable workflows.

**Deliverables (minimum):** shared login · release list · project access · Prepare workspace · native audio/artwork pickers · DnD · secure session · native export · desktop shell · window-state persistence · basic local processing · job status · diagnostics · signed **dev/test** releases · update-channel PoC.

**Exit gate:** Windows installer/test build completes Prepare free scan using native pickers; session survives restart; no secrets in binary.

**Non-goals:** macOS/Linux; full batch mastering; store-grade signing if not ready (document).

---

### Phase 2.A — Android alpha

**Purpose:** First-class mobile client for release continuity.

**Deliverables (minimum):** shared login · release list · project access · metadata edit · Findings review · document selection · gallery import · upload queue · connectivity · deep links · push foundation · mobile shell · job status · signed APK · AAB build validation.

**Exit gate:** APK installs; user signs in; opens same Release Project as Cloud; imports file; sees Findings; deep link opens project (or documented partial with web fallback).

**Non-goals:** iOS; heavy on-device DSP; Play production listing without Phase R.

---

### Phase P — Processing-engine maturation (parallel)

Shared contracts · Worker impl · Desktop native impl · Remote worker · capability negotiation · processing-version tracking · result schemas · golden tests · cancel/retry.

### Phases 3–9

Unchanged product intent from Suite Genesis (Credits → MasterReady → CoverLab →
Sentinel → Relay → Artist/VDock/Live/Market unification → Automation/scale), with
**mandatory** use of Platform Bridge, shared domain packages, and three-level
processing — no new browser-only assumptions.

### Phase R — Distribution readiness

Web prod gates · Desktop signing/installer/channels · Android store tracks/privacy —
per §20. Required before public Desktop/Android marketing.

---

## 23. Documentation rewrite plan

| Document | Action |
|----------|--------|
| `VYBZ_MASTERPLAN.md` | **Rewritten** (this file) |
| `AGENTS.md` | Amend pickup → Phase 1.5; multi-client truth |
| `ARCHITECTURE.md` | Amend topology + bridge + clients |
| `SECURITY.md` | Amend multi-client threat model |
| `VERSIONING.md` | Note client version sync |
| `README.md` | Multi-platform overview |
| `CHANGELOG.md` | Record blueprint expansion |
| `CONTRIBUTING.md` | Dev env for Tauri/Android |
| `docs/DOCUMENTATION_MANIFEST.md` | Register new platform docs |
| `docs/architecture/PLATFORM_OVERVIEW.md` | Rewrite for three shells |
| `docs/architecture/FRONTEND_ARCHITECTURE.md` | Shell composition modes |
| `docs/architecture/PLATFORM_BRIDGE.md` | **Create** |
| `docs/architecture/ADR_DESKTOP_TAURI.md` | **Create** |
| `docs/architecture/ADR_ANDROID_CAPACITOR.md` | **Create** |
| `docs/architecture/ADR_INDEX.md` | Link new ADRs |
| `docs/architecture/AUTH_AND_DEEPLINKS.md` | **Create** |
| `docs/architecture/OFFLINE_AND_SYNC.md` | **Create** |
| `docs/architecture/REPO_WORKSPACE_PLAN.md` | **Create** |
| `docs/architecture/STORAGE_ARCHITECTURE.md` | Amend lifecycle |
| `docs/architecture/JOB_SYSTEM.md` | Amend three-level routing |
| `docs/architecture/VYBZ_ENGINE.md` | Clarify vs Desktop/Bridge |
| `docs/engineering/CAPACITOR.md` | Amend first-class Android |
| `docs/engineering/DEVELOPMENT.md` | Multi-platform setup |
| `docs/engineering/TESTING.md` | Cross-platform matrix |
| `docs/operations/RELEASES.md` | Desktop + Android tracks |
| `docs/operations/COST_CONTROL.md` | Local vs remote preference |
| `docs/design/RESPONSIVE_SYSTEM.md` | Shell composition |
| Pre-suite archive | Remains archived; never authoritative |

Mark any leftover “browser-only product” language as superseded.

---

## 24. Migration and compatibility strategy

| Concern | Strategy |
|---------|----------|
| Existing SPA routes/users | Backward compatible; SuiteShell already wraps App |
| Capacitor android/ | Keep root project until apps/android cutover proven |
| Auth sessions | Same Supabase project; platform storage adapters only |
| Storage paths | Unchanged buckets; clients upload to same origins |
| Feature flags | Extend `src/lib/flags.ts` for prepare/desktop/android |
| Storefront WIP | Isolate; migrate under Market later |
| Music Repos + Engine | Preserve; Desktop integrates later without replacing CAS |
| DB | Additive only |
| Rollback | Feature flags + keep web build path pristine |

---

## 25. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Monorepo thrash | Stage A–F; Stage F last; CI green each stage |
| Capacitor limits | Spike in 1.5; RN only with written proof |
| Tauri learning curve | PoC early; keep web shippable independently |
| Secret leakage in native shells | Threat model; allowlists; secret scanning |
| Offline complexity | Drafts-only first; no full collab offline |
| Cost blowup remote jobs | Cost Sentinel; reservations; kill switches |
| Doc drift | Manifest + conflict order; archive superseded |
| Premature store submission | Phase R gates |
| Agent mis-scope (“rewrite frontend”) | This blueprint + AGENTS hard laws |

---

## 26. Definition of completion

### Suite Genesis multi-platform blueprint (this expansion)

- [x] One shared product core doctrine
- [x] One account / DB / storage architecture
- [x] Cloud + Desktop (Tauri) + Android (Capacitor) shells defined
- [x] Platform Bridge mandated
- [x] Three-level processing defined
- [x] Offline/sync realism defined
- [x] Phase 1.5 inserted; Phases 0–1 preserved
- [x] Documentation migration inventory
- [x] Phase 1.5 implementation exit gate
- [x] Phase 2 Prepare MVP
- [ ] Desktop + Android alphas
- [ ] Phase R public distribution

### Product completion (north star)

> A VYBZ user owns one account, one creative identity, and one continuous body of
> work that follows them across browser, desktop, and mobile.

---

## Brand and copy (platform)

**Eyebrow:** The release operating system for independent music.  
**Headline:** Everything between finished and released.  
**Body:** Prepare, protect, credit, master, package and present your music from one connected workspace — on web, desktop, or mobile.  
**Primary CTA:** Start a release · **Secondary:** Run a free readiness scan  
**Pricing:** Start free. Pay only when a release needs paid infrastructure or professional processing.  
**Brand principle:** *The platform provides precision. The artist provides expression.*

---

## Future extensibility (non-blocking)

Architecture must not block future macOS, Linux, iOS, tablet layouts, shared native
libs, plugins, local models, team/org workspaces, collab sessions, or distribution
providers — but **immediate priority** remains:

1. Preserve and advance VYBZ Cloud  
2. Establish platform-safe shared architecture (Phase 1.5)  
3. Deliver Windows Desktop alpha  
4. Deliver Android alpha  
5. Mature processing, sync, and distribution workflows  
