# VYBZ

> **Find Yours.**  
> **A folder of files is not a product.**

VYBZ is a **sample pack creation suite with a marketplace** — ingest, tag, preview,
package a measured ZIP, and sell it. Owner: **Astra Matrix, Inc.** Canonical domain:
**`vybz.cloud`**. The rest of the house (desks, radio, social) stays in the tree.

**One account · one cloud · three clients:** **VYBZ Cloud** (web) · **VYBZ Desktop**
(Tauri 2, Windows first) · **VYBZ Mobile** (Capacitor / Android first), all on
**VYBZ Platform Services** (Supabase).

**VYBZ has no anonymity.** Every account is a durable creator identity. No ads.
No connection paywalls. Messaging free forever.

> **One authority:** [`PRODUCT.md`](./PRODUCT.md) — what we are building and what we refuse to
> build. Enforceable rules live in [`src/product/invariants.ts`](./src/product/invariants.ts).
> [`AGENTS.md`](./AGENTS.md) is how to work here · [`STATE.md`](./STATE.md) is where things
> stand · [`docs/decisions/`](./docs/decisions/) records why.
> Everything else under `docs/` is reference, and `docs/archive/` is never authoritative.

## What VYBZ is

| Module | Role |
|--------|------|
| **Library** | Ingest and organize the files you already have |
| **Pack Maker** | Tag, measure, and build a ZIP with a SHA manifest |
| **Storefront / Market** | Publish a pack, take a card, deliver the ZIP |
| **Desks** | Correct, translate, metadata, stems, midi, convert — from a track, not from empty nav |
| **Parked** | Station, sparks-on-station, rooms, live, social home — reachable, not the default |

## What's shipped today (foundation)

- Marketing landing + alpha waitlist + Enter VYBZ (`/enter`)
- Passkey-first auth, artist pages `/u/:id`, VDock playback, Vc tips + cosmetics
- LiveKit live sessions, Music Repos + `tools/vybz-bridge`
- Sample Pack Storefront (`/tools/packs`, `/pack/:slug`)
- AI visualizer stills (`visual-generate`) → Studio → Compose backdrop
- Watermark embed/detect Edge Functions
- Supabase Storage media origin (`site-visuals` CDN); Bunny dormant

Delivery state for each of these is recorded in [`STATE.md`](./STATE.md). Code merging is
not delivery — see [`PRODUCT.md`](./PRODUCT.md) §12.

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
| [`PRODUCT.md`](./PRODUCT.md) | Product authority |
| [`src/product/invariants.ts`](./src/product/invariants.ts) | The rules, in code |
| [`AGENTS.md`](./AGENTS.md) | Agent / ops pickup contract |
| [`STATE.md`](./STATE.md) | Current checkpoint |
| [`docs/decisions/`](./docs/decisions/) | Decision records |
| [`docs/architecture.md`](./docs/architecture.md) | Platform overview |
| [`SECURITY.md`](./SECURITY.md) | Threat model and controls |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Branch / PR / policy |
| [`docs/`](./docs/) | Architecture, products, design, ops, engineering, agents |
| [`docs/archive/`](./docs/archive/) | Historical only — never authoritative |

## Security reporting

Report vulnerabilities privately to the Astra Matrix owners. Do not file public
issues that include exploit detail for unpatched production flaws.

## License / ownership

Proprietary — Astra Matrix, Inc. Repository: [ALaustrup/VYBZ](https://github.com/ALaustrup/VYBZ).

---

by ASTRA MATRIX
