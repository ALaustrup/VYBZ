# VYBZ Architecture

> **Authority 3 of 5.** Verified architecture only. Everything here was confirmed by
> reading source, querying the deployment, or issuing a live request during the Stage 1
> forensic intake on 2026-08-01.
>
> **Planned architecture does not belong in this file.** If it is not built, it belongs in
> [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md) §8 or [`IDEAS_BACKLOG.md`](./IDEAS_BACKLOG.md).

---

## 1. Applications

| Client | Technology | Location | Distribution state |
|---|---|---|---|
| **VYBZ Cloud** (web) | Vite 6 + React 18 + TypeScript 5.6 strict, SPA/PWA, Tailwind 3 | repository root `src/` | Live at https://vybz.cloud |
| **VYBZ Desktop** | Tauri 2 | `apps/desktop/src-tauri` | Windows, macOS and Linux targets build in CI. **No installer distributed.** |
| **VYBZ Android** | Capacitor 8, `appId: cloud.vybz.app` | `android/` | AAB builds in CI. **No Play listing.** |
| **VYBZ iOS** | Capacitor shell + SPM plugins | `ios/App` | IPA builds in CI. **No TestFlight build.** Deferred. |
| **Platform Services** | Supabase (Auth, Postgres + RLS, Storage, Realtime, Edge Functions), Stripe, LiveKit, Resend | `supabase/` | Live |

Node 20+ locally; the Vercel build uses Node 24.x. Package manager is **npm** — do not
switch casually.

## 2. Packages and boundaries

`packages/domain/{releases,credits,collab}` · `packages/data/{releases,credits}` ·
`packages/processing/{waveform,mastering,metadata,readiness}`

These resolve through **TypeScript path aliases (`@vybz/*`), not npm workspaces.** The root
`package.json` has no `workspaces` key. Treat a full workspace extraction as a proposal, not
a plan.

**Hard boundary:** domain and processing code must never import `@tauri-apps/*` or
`@capacitor/*`. Platform capability is reached only through the Platform Bridge at
`src/platform/bridge/` (web · desktop · android · ios · mock).

`src/platform/` also holds `{jobs, costs, audit, orgs, sync, collab, cache, deeplinks, push}`
and `providerHealth.ts`.

---

## 3. Routing and the authentication gate

`src/App.tsx` decides everything before the router runs. **Read it before changing any
route.** The evaluation order is:

1. **Backend availability.** No `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` → local
   shells for Prepare / desktop / Android paths, otherwise a hard stop.
2. **Session loading** → spinner.
3. **Signed out** → `PrepareLocalApp` for prepare paths when `FLAGS.prepare`;
   `DesktopLocalApp`; `AndroidLocalApp`; `PublicPackShell` for `/pack/*` when
   `FLAGS.storefront`; `PublicDocShell` for `/codex*` and `/legal*`; `Onboarding` for
   `/enter*`; **everything else falls through to `LandingPage`.**
4. **Signed in, profile not yet loaded** → spinner.
5. **Signed in, no alpha access** (OR-023) → `InviteRedeemPage`, unless admin /
   `alpha_access_at` set. Public Codex/legal still allowed. Profiles present at the
   invite-keys migration were grandfathered.
6. **Signed in, no username** → `UsernameSetup`.
7. **Otherwise** → `SuiteShell` and the authenticated route tree.

(Role-intent onboarding is no longer a hard shell gate in `App.tsx`; intake helpers may
still exist in the API.)

Two architectural consequences follow, both currently defects:

**Silent fallback.** Any unknown or protected path, signed out, renders the marketing page
at HTTP 200 rather than prompting for sign-in. `/settings/costs` looks like a valid
marketing page to an anonymous visitor. Owned by M3.

**Anonymous surfaces.** Prepare (`/releases`, `/release/:id`, `/start`), the desktop and
Android local shells, public packs, Codex and legal pages all render without an account.
For Prepare this is intentional and valuable; it is simply undiscoverable.

`/__e2e__/*` fixture routes previously evaluated before every check above. They were
compiled out of production builds on 2026-08-01 and are gated behind `VITE_E2E_FIXTURES`,
enabled only by `npm run build:e2e`, with `npm run check:no-fixtures` failing CI if a marker
reappears in `dist/`.

**Navigation is inverted today.** Eight of fourteen Primary Rail entries — Credits,
MasterReady, CoverLab, Sentinel, Relay, Wallet, Settings, and Market when the storefront
flag is off — render `SuitePlaceholderPage`, while the working Credits, Master and
Distribution surfaces at `/release/:id/*` have no navigation entry at all. M3 owns this.

---

## 4. Data flows

**Analysis.** File → Web Worker (`packages/processing/readiness/src/worker.ts`) → header
and dimension probes → `packages/domain/releases` rules → findings persisted per release.
Desktop routes instead through Tauri `vybz_analyze_audio` (`apps/desktop/src-tauri/src/audio.rs`).
Both paths currently implement the same limited measurement set; see §9.

**Mastering.** WAV → `packages/processing/mastering` DSP, client-side or via the
`ai-mastering` edge function → mastered WAV plus metrics.

**Release preparation.** `src/features/prepare` → `@vybz/data/releases` → Supabase, with
offline mutations queued through `src/platform/sync`.

**Export.** `buildReport.ts` → `packageZip.ts` → ZIP containing a JSON report and a SHA-256.

## 5. Processing tiers

| Tier | Where | Cost | Limits |
|---|---|---|---|
| Portable | Browser Web Worker | $0 | 10 MB FFT ceiling; WAV PCM only |
| Native | Tauri Rust | $0 | Desktop only; WAV PCM only (`audio_format == 1`) |
| Remote | Supabase Edge | metered in V¢ minutes | `processing-enqueue` is a **skeleton** — see §9 |

## 6. Storage

Buckets: `site-visuals` (public CDN) · `media-public` · `audio-assets` · `project-files` ·
`storefront-previews` · `storefront-zips`, plus Music Repos content-addressed blobs.
**No per-client silos.** Supabase Storage is the only media origin; Bunny edge functions
exist but are dormant and must stay that way. Live video is LiveKit.

## 7. Database

99 migration files in `supabase/migrations/` (10 are `.down.sql`), numbered `0001`–`0089`.
Migrations are additive. A formal migration-history workflow is still open (OR-010).

## 8. Edge functions

30 directories under `supabase/functions/`, plus `_shared/`. JWT verification is on by
default with one deliberate exception: **`ai-topup` deploys `--no-verify-jwt` and verifies
the JWT in-function**; redeploy `stripe-webhook` alongside it for `kind=ai_topup`.

---

## 9. Analysis capability — what is actually computed

Recorded here because Law 1 requires the gap to be visible in the architecture, not
buried in a report.

**Implemented:** waveform peaks · sample peak dBFS · RMS dBFS · an approximate integrated
loudness · a single mid-file 1024-point Hann FFT · WAV container facts (sample rate,
channels, bit depth, duration) · PNG/JPEG pixel dimensions.

**Not implemented:** true peak (dBTP) · short-term and momentary loudness · loudness range ·
crest factor · PLR · clipping detection · DC offset · phase correlation · mono compatibility ·
measured stereo width · time-varying spectral analysis · dynamic range · key · tempo.

**Known integrity defects, all owned by M3 and M4:**

- `DistributionReportPage.tsx:71` substitutes `{ integratedLufs: -14, truePeakDb: -1.5 }`
  when probe data is absent. **True peak is never computed anywhere.**
- `DistributionReportPage.tsx:89` defaults artwork DPI to 300. **DPI is never parsed** —
  the PNG `pHYs` chunk and JFIF density are not read, so the DPI rule can never fire.
- `loudness.ts` and `audio.rs` both compute `−0.691 + 10·log₁₀(mean square)` over gated
  0.4 s RMS windows with **no K-weighting**. This is not ITU-R BS.1770 and must not be
  labelled "LUFS" without qualification.
- `packages/processing/metadata/infer.ts` derives genre, mood, BPM, a confidence score and
  an **ISRC suggestion** from a hash of title, artist and duration.
- `readiness/src/worker.ts` probes headers for `.wav` only. FLAC, AIFF, MP3, M4A and OGG
  yield no sample rate, channels, bit depth or duration, and the dependent rules silently
  skip.
- `processing-enqueue` marks jobs `completed` with an empty stub, reporting success for
  work never performed.
- `mastering/src/master.ts` targets −14 dBFS **RMS** while −14 is the LUFS figure; its
  "limiter" is a linear gain reduction; `stereoWidth` defaults to 1.05, silently widening
  every master; output is always re-encoded to 16-bit with no dither.

## 10. Security boundaries

Supabase Auth with RLS on every user table. No client secret may bypass RLS. `service_role`,
`sbp_`, Stripe secret, Resend, fal and Groq keys never appear in `VITE_*`. Desktop packaging
is not a secret store.

Production response headers are enforced and verified: CSP with `script-src 'self'`, HSTS
`max-age=63072000`, `x-frame-options: DENY`, `frame-ancestors 'none'`,
`x-content-type-options: nosniff`, `referrer-policy: strict-origin-when-cross-origin`.

---

## 11. Deployment topology

```
GitHub ALaustrup/VYBZ (main)
   └─ Vercel native Git integration  (no workflow-based deploys)
        team    team_gq3IWtz1kK0aO7kzMrrk6N6a
        project prj_LY89Q0WAbKMfNmtYTyg1eQRrBfbI  ·  framework vite  ·  Node 24.x
   └─ Cloudflare proxy → Vercel origin
        https://vybz.cloud
```

Twelve domains resolve to this project: `vybz.cloud`, `www.vybz.cloud`, `vybz.cc`,
`vybz.guru`, `vybz.work`, `vybz.space`, `vybz.world`, `vyb-audio.vercel.app`,
`vybz.astramatrix.xyz`, `vybaudio.astramatrix.xyz`, and two Vercel aliases.

Backend: Supabase project `xixmneooyufbeftdfpcm` (us-west-1) — **never** point at any other
project. Email: Resend on `vybz.cloud`, from `VYBZ <noreply@vybz.cloud>`. Payments: Stripe
`acct_1TwTEtAnnpt9OYZI`.

## 12. Feature flags

Source of truth is `src/lib/flags.ts`. Default-on flags use `!off(env)`; opt-in flags use
`on(env)`.

| Flag | Env var | Default |
|---|---|---|
| `pro` | `VITE_FEATURE_PRO` | on |
| `repos` | `VITE_FEATURE_REPOS` | on |
| `socialLive` | `VITE_FEATURE_SOCIAL_LIVE` | on |
| `storefront` | `VITE_FEATURE_STOREFRONT` | on |
| `prepare` | `VITE_FEATURE_PREPARE` | on (**undocumented in `.env.example`**) |
| `tips` | `VITE_FEATURE_TIPS` | off |
| `oauthSpotify` | `VITE_FEATURE_OAUTH_SPOTIFY` | off |
| `swarm` | `VITE_FEATURE_SWARM` | off |
| `bunnyAudio` | `VITE_FEATURE_BUNNY_AUDIO` | off — **must stay off** |
| `roleClass` | `VITE_FEATURE_ROLE_CLASS` | on — **never read anywhere** |
| `liveBoost` | `VITE_FEATURE_LIVE_BOOST` | off — **never read anywhere** |

## 13. Frozen and excluded code

Frozen modules remain in the tree, are imported by nothing, and must not enter production
bundles: `src/features/collab/`, `src/platform/collab/`, `packages/domain/collab/`,
`src/components/repos/RepoCollabPanel.tsx`. Their database tables (migration `0088`) remain
in place. `is_project_member` has zero references in `src/`, so freezing client code does
not affect RLS.

## 14. Preserved subsystems

| Concern | Anchor |
|---|---|
| Music Repos CAS | `src/lib/repoSync.ts`, `src/lib/api.ts`, migrations `0059`/`0060` |
| Local companion (VYBZ Engine) | `tools/vybz-bridge/` — distinct from the Platform Bridge |
| Watermarking | `supabase/functions/watermark`, `watermark-detect`, `_shared/watermark.mjs` |
| Suite shell and tokens | `src/shell/`, `src/design/`, `src/components/ui/`, `src/components/states/` |
| Device sync | `src/platform/sync/` — one user, many devices; **not** collaboration |

## 15. Operational notes

- Large media is gitignored; serve it from Storage.
- `data-theme="smoke"` is the intended Suite v2 dark root, not a legacy fallback.
- VDock overlays mount through `OverlayPortal` on `document.body`.
- A native app is not "done" because a webview opens.
- GitHub Actions jobs failing instantly with "no runner assigned" usually means a billing
  limit, not a broken workflow.
- Tailwind prunes unused classes, so verifying a class in production requires it to be
  applied somewhere.

## 16. Document map

Five authorities: [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md) ·
[`AGENTS.md`](./AGENTS.md) · this file · [`STATUS.md`](./STATUS.md) ·
[`IDEAS_BACKLOG.md`](./IDEAS_BACKLOG.md).

Standard repository files sit outside that set and remain valid: `README.md`,
`CONTRIBUTING.md`, `SECURITY.md`, `VERSIONING.md`, `CHANGELOG.md`.

Non-authoritative reference lives in `docs/architecture/` (ADRs and registries),
`docs/design/`, `docs/engineering/` and `docs/operations/`. Superseded material lives in
`docs/archive/` and carries a HISTORICAL ONLY banner.
