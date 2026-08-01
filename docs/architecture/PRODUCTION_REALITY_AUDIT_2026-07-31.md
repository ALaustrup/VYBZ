# Production Deployment and User-Experience Reality Audit

> **Evidence baseline for Master Blueprint v2.** Strictly read-only audit conducted
> 2026-07-31 → 2026-08-01 UTC against live production. No code was changed.
> Authority: [`VYBZ_MASTERPLAN.md`](../../VYBZ_MASTERPLAN.md) §0, §2, §21, §22, §23.

## Why this audit happened

The repository reported eighteen completed phases and seven merged UI-polish PRs, yet
`https://vybz.cloud` appeared substantially unchanged. The hypothesis under test was a
broken or stale deployment.

**That hypothesis was wrong.** Production was, and is, exactly current. The gap is
between *merged* and *delivered*.

---

## 1. Headline findings

1. Production runs repository HEAD `a84d984ad6a5d242b44f0d6acc3427b450de8446`. Proven
   twice, independently. **There is no deployment problem.**
2. The only surface an anonymous visitor sees is `LandingPage.tsx`, which **no phase and
   no polish PR ever modified**.
3. The landing page links to exactly four destinations: `/enter`, `/legal/terms`,
   `/legal/privacy`, `#waitlist`. **Nothing links to any Suite feature.**
4. Prepare, Credits, Distribution, MasterReady and the Collab panels all work in
   production, anonymously, with no account — and are reachable only by typing the URL.
5. Five `/__e2e__/*` Playwright fixture routes bypass authentication and are live on the
   public internet with seeded fake data. **Security defect.**
6. Seven of fourteen primary nav entries render a "Suite placeholder" empty state.
7. Six of seven merged UI-polish PRs changed components that never render for a
   signed-out visitor. The single anonymous-visible artifact of the entire sweep is the
   favicon.

---

## 2. Deployment source (verified)

| Item | Value | Evidence |
|---|---|---|
| Git repository | `github.com/ALaustrup/VYBZ` (private, repoId `1289727202`) | Deployment `meta.githubRepo`; matches local `git remote -v` |
| Vercel team | Astra Matrix — `team_gq3IWtz1kK0aO7kzMrrk6N6a` | `list_teams` |
| Vercel project | `vybz` — `prj_LY89Q0WAbKMfNmtYTyg1eQRrBfbI` | `get_project`; matches `.vercel/project.json` |
| Production branch | `main` | Every `target: production` deployment: `githubCommitRef: main` |
| Root directory | Repository root | Root `vercel.json`; no override |
| Framework / build / output | `vite` · `npm run build` · `dist` · Node `24.x` | `vercel.json`, project settings |
| Deploy region | `iad1` | `get_deployment.regions` |
| Deployment protection | Password off · SSO off · Trusted IPs off | `get_project_deployment_protection` |
| `vybz.cloud` | In project domains **and** in the production deployment's `alias[]`; `aliasError: null` | `get_deployment` |
| Edge path | Cloudflare proxy → Vercel origin | `Server: cloudflare`, `CF-RAY`, `x-vercel-id: sfo1::…`, `x-vercel-cache: HIT` |

`vercel.json` overrides are behaviour-neutral: SPA rewrite `/(.*) → /index.html`, three
redirects, strict CSP, cache headers. No workflow deploys to Vercel; `ci.yml` only
validates.

**Production SHA: `a84d984ad6a5d242b44f0d6acc3427b450de8446` — PROVEN.**
Deployment `dpl_4MngwP5sTcN7XGwj5n9ZPwyztBs2`, `READY`, `target: production`,
commit *"Merge pull request #29 from ALaustrup/ui/appbar-chips-polish"*, verified
signature, built → ready 2026-07-31 20:42 UTC.

---

## 3. Bundle fingerprinting (second independent proof)

Vercel configuration alone does not prove what is served. The live bundle
(`/assets/index-CLO8B_cn.js`, `/assets/index-CHytC-9D.css`) was downloaded and searched
for strings that exist only because of specific merged PRs:

| Fingerprint | From | Occurrences |
|---|---|---|
| `via-ink-900 to-ink-950` | PR #22 `NowPlayingStage` | 1 |
| `accent-suite-cyan` | PR #23 `VisualizerStudioPage` | 5 |
| `suite-accent-wash-success` | PR #24 `index.css` | 2 |
| `hover:ring-suite-cyan/50` | PR #25 `ProfileMenu` | 1 |
| `suite-inspector glass-vibrant` | PR #27 `ContextInspector` | 1 |
| `ring-suite-cyan/50` | PR #29 `ContextualAppBar` | 2 |
| `glass-vibrant absolute right-0` | PR #29 upload menu | 2 |

Deployed `/favicon.svg` is **byte-identical** to `public/favicon.svg` at HEAD.

Dead code found: `suite-accent-wash-cyan` (added by PR #24) appears **zero** times —
defined but never applied, so Tailwind prunes it.

---

## 4. The auth gate (root cause)

`src/App.tsx` evaluates, in order, before the authenticated shell is built:

```text
/__e2e__/mastering | cost-sentinel | ai-credits | collab | storefront-orders
        → fixture page, no auth
!userId:
    isPreparePath  (/start, /releases, /releases/*, /release/*) → PrepareLocalApp
    isDesktopLocalPath (/desktop/process, /desktop/waveform)    → DesktopLocalApp
    isAndroidLocalPath (/mobile/uploads, /android/beta)         → AndroidLocalApp
    /pack/:slug  (FLAGS.storefront)                             → PublicPackShell
    /codex, /codex/:slug, /legal/:slug                          → PublicDocShell
    /enter, /enter/*                                            → Onboarding
    everything else                                             → LandingPage
```

The final line is the problem. An unlisted path returns **HTTP 200 with the marketing
page and an unchanged URL**. Verified live: `https://vybz.cloud/settings/costs` renders
"Find Yours." with the waitlist form. It does not look like an auth wall; it looks like
the feature does not exist.

---

## 5. Live verification performed

All unauthenticated, against `https://vybz.cloud`.

| Route | Result |
|---|---|
| `/` | Marketing landing — "Find Yours.", waitlist, Enter VYBZ |
| `/releases` | **Prepare shell renders** — "Prepare · local drafts", New release, All/Draft/Blocked/Ready tabs |
| `/releases/new` | New-release form — Title, Primary artist, Import audio, Import artwork |
| `/release/:id` | Created a local draft: readiness scan returned **1 blocking · 2 warnings**, plus Collab presence strip and "Prepare comments" thread |
| `/release/:id/credits` | Credits editor — role combobox, splits, Add credit, Metadata merge panel, Credit comments |
| `/release/:id/distribution` | Distribution readiness — 4 pass/fail checks + Download ZIP |
| `/release/:id/master` | MasterReady — "Analyze & Master" (disabled without a WAV), Top up credits link |
| `/mobile/uploads` | Android Beta mirror — Upload queue, "Offline-safe · retry with progress" |
| `/pack/<nonexistent>` | Public pack shell renders → `FLAGS.storefront` is **ON** in production |
| `/settings/costs` | **Marketing landing page** — auth-gated, silently |
| `/__e2e__/collab` | **Test fixture renders publicly** with seeded users "ben" and "ava" |

Environment inference: `/` rendering `LandingPage` rather than the
`backendEnabled === false` hard-stop proves `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` are present in production.

A local draft release (`Audit Probe`) was created in browser IndexedDB only. No server
write occurred.

---

## 6. UI-polish PR audit (#22–#29)

**Correction of record:** PR #28 does not exist. `#28` is an open *issue*
("UI polish: UploadQueue panel glass"). Merged PRs are #22, #23, #24, #25, #26, #27, #29.

Combined footprint: **17 files, +117 / −97 lines.** Every change is a Tailwind class or
CSS-variable substitution. No component was added, removed, or restructured.

| PR | Files | Component | Visible signed out? | Materiality |
|---|---|---|---|---|
| #22 | 4 (+17/−13) | GlobalPlayer, MusicSourceSheet, NowPlayingStage, VDockPins | No | Imperceptible (`ink-900` ≈ `#0a1428`); only the added player blur is real |
| #23 | 2 (+44/−35) | VisualPicker, VisualizerStudioPage | No | Minor, on a rarely-opened page |
| #24 | 4 (+21/−11) | Cost/AI banners, `index.css` | No | Imperceptible. The one public instance (`ReleaseMasterPane` low-balance banner) is guarded by `creditBalance < AI_LOW_BALANCE_SECONDS`, never true for anon |
| #25 | 3 (+18/−18) | favicon, ProfileMenu, OrbJoystick | **Favicon only** | The sole anonymous-visible change of the sweep — a hue shift in a 16 px icon |
| #26 | 1 (+2/−0) | `main.tsx` comment | N/A | Zero user impact |
| #27 | 2 (+5/−5) | CommandBar, ContextInspector | No | Minor — real glass blur, invisible to anon |
| #29 | 1 (+10/−15) | ContextualAppBar | No | Minor — 20 px → 24 px icons is the only perceptible part |

---

## 7. Ranked causes

| Cause | Label |
|---|---|
| Changed components are not on any page an ordinary visitor reaches | `CONFIRMED` |
| UI changes too minor to notice | `CONFIRMED` |
| Authentication prevents access (Cost Sentinel, AI credits, storefront, Studio, shell) | `CONFIRMED` |
| Features not connected to navigation | `CONFIRMED` |
| Changes limited to native applications (phases 5, 6, 12, 13, 17, 19) | `CONFIRMED` |
| Changes limited to backend infrastructure | `CONFIRMED` |
| Placeholder/stub implementations occupying nav | `CONFIRMED` |
| Documentation overstating completion | `CONFIRMED` |
| Service worker / CDN caching (`registerType: autoUpdate` → one-load lag) | `POSSIBLE`, not primary |
| Missing environment variables | `RULED OUT` |
| Production deploying an older SHA | `RULED OUT` |
| Wrong Vercel project / branch / root | `RULED OUT` |
| Build excluding new packages or routes | `RULED OUT` |
| Quality of the authenticated experience | `UNKNOWN — INSUFFICIENT EVIDENCE` |

---

## 8. Per-phase code distribution

Files changed between consecutive phase tags, categorised:

| Phase | web | native | infra | docs | tests | other |
|---|---:|---:|---:|---:|---:|---:|
| 3 Credits | 8 | 0 | 2 | 8 | 4 | 13 |
| 4 Processing | 10 | 0 | 3 | 7 | 3 | 13 |
| 5 Desktop Alpha | 9 | 10 | 1 | 8 | 2 | — |
| 6 Android Alpha | 12 | 6 | 1 | 8 | 6 | 1 |
| 7 Sync & Collab | 9 | 0 | 0 | 6 | 5 | 0 |
| 8 Distribution | 11 | 0 | 0 | 7 | 4 | 2 |
| 9 Polish & Visual | 21 | 0 | 7 | 6 | 2 | 1 |
| 11 Perf + Premium UI | 22 | 0 | 10 | 12 | 9 | 6 |
| 12 Desktop Beta | 8 | 8 | 4 | 10 | 2 | 1 |
| 13 Android Beta | 14 | 5 | 2 | 8 | 4 | 7 |
| 14 Cost Sentinel | 9 | 0 | 5 | 10 | 2 | 2 |
| 15 Remote AI | 8 | 0 | 6 | 8 | 4 | 13 |
| 16 Collab Sessions | 13 | 0 | 2 | 5 | 4 | 7 |
| 17 Desktop mac/Linux | 1 | 12 | 5 | 8 | 2 | — |
| 18 Cost-Minute Billing | 12 | 0 | 5 | 6 | 3 | 1 |
| 19 iOS Alpha | 11 | 26 | 3 | 9 | 5 | 3 |

`native` includes `apps/desktop/**`, `android/**`, `ios/**`. `other` is mostly
`packages/**` and root config.

---

## 9. Verdict

```text
PRODUCTION REALITY VERDICT                          2026-08-01 UTC

Repository HEAD:      a84d984ad6a5d242b44f0d6acc3427b450de8446 (main, clean)
Production SHA:       a84d984ad6a5d242b44f0d6acc3427b450de8446
Deployment current:   YES
Reachable by an ordinary visitor without a URL:
                      landing page, /enter, /codex + /legal only.
Reachable only by typing a URL:
                      Prepare, Credits, Distribution, MasterReady, Collab panels,
                      Android upload-queue mirror, desktop waveform mirror,
                      public pack shell, and five /__e2e__ test fixtures.
Implemented but unreachable:
                      Cost Sentinel (P14) and AI-minute billing (P18) — authed,
                      no nav entry. 7 of 14 nav slots are placeholders.
Native-only work:     Phases 5, 6, 12, 13, 17, 19. Zero installers, zero store
                      listings, zero TestFlight builds distributed.
Visible UI change since the earlier production version:
                      Anonymous — the favicon gradient. Nothing else.
                      Signed in — glass blur on player/inspector/command bar/app bar
                      and 20px → 24px app-bar icons.
Primary reason production appears unchanged:
                      The work is real and deployed but landed on surfaces no ordinary
                      visitor can reach. Navigation and discoverability problem, not a
                      deployment or build problem.
Phase-completion claims reliable:
                      PARTIALLY. Every claim is technically true; "Complete" conflated
                      merged code with delivered user value.
Confidence:           HIGH on deployment identity, bundle contents, routing, gating,
                      flags and the anonymous experience — all directly observed.
                      MEDIUM on native distribution status.
                      LOW / UNVERIFIED on the authenticated experience — no production
                      credentials were used.
```

---

## 10. Corrections mandated

Tracked as Track D in [`VYBZ_MASTERPLAN.md`](../../VYBZ_MASTERPLAN.md) §23.

| # | Correction |
|--:|---|
| D1 | Remove `/__e2e__/*` from production builds — security defect |
| D2 | Link the landing page to the free readiness scan |
| D3 | Real sign-in prompt for protected routes, preserving the destination |
| D4 | Resolve the 7 placeholder nav entries |
| D5 | Fix stale `phaseNote` product/phase numbering |
| D6 | First authenticated production verification pass |
| D7 | Discoverable entry for Cost Sentinel and AI credits |
| D8 | Delete unused `suite-accent-wash-cyan` |

**Track D exit gate:** a visitor with no account and no instructions can arrive at
`https://vybz.cloud`, reach the free readiness scan, complete it, and see Findings —
verified by screenshot. No `/__e2e__/` route resolves in production.
