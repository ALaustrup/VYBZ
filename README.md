# VYBZ

> **Find Yours.**  
> **Everything between finished and released.**

VYBZ is the **release operating system for independent music** — prepare, protect,
credit, master, package, distribute, and present your work, then keep it playing
for fans. Owner: **Astra Matrix, Inc.** Canonical domain: **`vybz.cloud`**.

**One account · one cloud · three clients:** **VYBZ Cloud** (web) · **VYBZ Desktop**
(Tauri 2, Windows first) · **VYBZ Mobile** (Capacitor / Android first), all on
**VYBZ Platform Services** (Supabase).

**VYBZ has no anonymity.** Every account is a durable creator identity. No ads.
No connection paywalls. Messaging free forever.

> **Five authorities:** [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md) (product doctrine) ·
> [`AGENTS.md`](./AGENTS.md) (how to work here) ·
> [`ARCHITECTURE.md`](./ARCHITECTURE.md) (verified architecture) ·
> [`STATUS.md`](./STATUS.md) (current checkpoint) ·
> [`IDEAS_BACKLOG.md`](./IDEAS_BACKLOG.md) (backlog).
> Everything under `docs/archive/` is historical and never authoritative.
>
> **Current milestone:** see [`STATUS.md`](./STATUS.md). Phase numbering is retired.

## What VYBZ is

| Module | Role |
|--------|------|
| **Home** | Release and audience command center |
| **Studio** | Music Repos — versions, branches, collaboration |
| **Prepare** | Know what is ready; fix what is not |
| **Credits** | Contributors, splits, approvals |
| **MasterReady** | Analysis and deliverables |
| **CoverLab** | Artwork readiness and repair |
| **Sentinel** | Secure prerelease sharing and provenance |
| **Relay** | Distribution packages and delivery status |
| **Artist / VDock / Live / Market** | Public catalog, playback, performance, digital products |

## What's shipped today (foundation)

- Marketing landing + alpha waitlist + Enter VYBZ (`/enter`)
- Passkey-first auth, artist pages `/u/:id`, VDock playback, Vc tips + cosmetics
- LiveKit live sessions, Music Repos + `tools/vybz-bridge`
- Sample Pack Storefront (`/tools/packs`, `/pack/:slug`)
- AI visualizer stills (`visual-generate`) → Studio → Compose backdrop
- Watermark embed/detect Edge Functions
- Supabase Storage media origin (`site-visuals` CDN); Bunny dormant

Delivery state for each of these is recorded in [`STATUS.md`](./STATUS.md). Code merging is
not delivery — see [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md) §12.

## Local development

```bash
npm install
cp .env.example .env   # set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev            # http://localhost:5173
npm run lint
npm run build
```

Node 20+. Missing Supabase env → app hard-stops (not a mock offline mode).

## Documentation map

| Doc | Purpose |
|-----|---------|
| [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md) | Product authority |
| [`AGENTS.md`](./AGENTS.md) | Agent / ops pickup contract |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Platform overview |
| [`SECURITY.md`](./SECURITY.md) | Threat model and controls |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Branch / PR / policy |
| [`docs/`](./docs/) | Architecture, products, design, ops, engineering, agents |
| [`docs/archive/`](./docs/archive/) | Historical only — never authoritative |

## Security reporting

Report vulnerabilities privately to the Astra Matrix owners. Do not file public
issues that include exploit detail for unpatched production flaws.

## License / ownership

Proprietary — Astra Matrix, Inc. Repository: [ALaustrup/VYBZ](https://github.com/ALaustrup/VYBZ).
