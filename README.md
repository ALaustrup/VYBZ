# VYBZ

> **Find Yours.**  
> **Produce, perform, and mix live with the world in real time.**

VYBZ is the **ultimate live mix audio streaming platform**, giving producers and artists a place to produce their music, sound, and audio projects with listeners around the world in real time live. Owner: **Astra Matrix, Inc.** Canonical domain: **`vybz.cloud`**.

**One account · one cloud · three clients + DAW plug-in:**
- **VYBZ Web:** Interactive live stage, rooms, and visualizers.
- **VYBZ Desktop:** (Tauri 2, Windows & macOS) with DAW folder watcher and studio audio routing.
- **VYBZ Mobile:** (Capacitor, Android-first) for companion remote mixing and mobile live streaming.
- **VYBZ Broadcast Plug-in:** (VST3 / CLAP / AU) directly on the master channel of Ableton, FL Studio, Logic, Reaper.

**VYBZ has no anonymity.** Every account is a durable creator identity. No ads. No connection paywalls. Messaging free forever.

> **One authority:** [`PRODUCT.md`](./PRODUCT.md) — what we are building and what we refuse to build.  
> Enforceable rules live in [`src/product/invariants.ts`](./src/product/invariants.ts).  
> [`AGENTS.md`](./AGENTS.md) is how to work here · [`STATE.md`](./STATE.md) is where things stand · [`docs/decisions/`](./docs/decisions/) records why.  
> Everything else under `docs/` is reference, and `docs/archive/` is never authoritative.

## What VYBZ is

| Module | Role |
|--------|------|
| **Live Mix Rooms** | Real-time live production sessions, stage visualizer, presence, and chat |
| **DAW Broadcast Plug-in** | Stream master-bus audio directly from your DAW to LiveKit SFU in stereo HD |
| **Android Sync & Companion** | Hardware-style remote session control and mobile live mixing |
| **Living Mix Engine** | Intelligent track sequencing, transitions, and energy curve management |
| **Studio Tool Drawer** | 9 DSP correction desks, Stem splitter, MIDI maker, and Car/Club acoustic preview |
| **Marketplace & Pack Maker** | Export recorded live mixes as measured sample packs with SHA manifests and sell via Stripe |
| **Library** | Organize, search, and summon catalog files directly into live sessions |

## What's shipped today (foundation)

- LiveKit SFU stereo music mode token generation (`livekit-token` edge function)
- Living Mix intelligent mix planner (`/library/mix`)
- Live Watch page with WebGL stage visualizer, presence, and V¢ tipping (`/live/:id`)
- Passkey-first auth, creator profiles, VDock dry playback monitor
- 9 DSP audio correction desks, stem separation, and MIDI transcription
- Sample Pack Storefront with verified Stripe checkout and signed ZIP delivery
- Forensic watermark embed/detect Edge Functions
- Universal Platform Bridge across Web, Android (Capacitor), and Desktop (Tauri)

Delivery state for each of these is recorded in [`STATE.md`](./STATE.md). Code merging is not delivery — see [`PRODUCT.md`](./PRODUCT.md) §12.

## Local development

```bash
npm install
cp .env.example .env   # set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev            # http://localhost:5173
npm run lint
npm run test
npm run build
```

Node 20+. Missing Supabase env → app hard-stops (not a mock offline mode).

## Documentation map

| Doc | Purpose |
|-----|---------|
| [`PRODUCT.md`](./PRODUCT.md) | Product authority (Live Mix Audio Streaming Platform) |
| [`src/product/invariants.ts`](./src/product/invariants.ts) | The rules, in code |
| [`AGENTS.md`](./AGENTS.md) | Agent / ops pickup contract |
| [`STATE.md`](./STATE.md) | Current checkpoint |
| [`docs/decisions/`](./docs/decisions/) | Decision records (0001–0004) |
| [`docs/architecture.md`](./docs/architecture.md) | Platform overview |
| [`SECURITY.md`](./SECURITY.md) | Threat model and controls |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Branch / PR / policy |
| [`docs/`](./docs/) | Architecture, products, design, ops, engineering |
| [`docs/archive/`](./docs/archive/) | Historical only — never authoritative |

## Security reporting

Report vulnerabilities privately to the Astra Matrix owners. Do not file public issues that include exploit detail for unpatched production flaws.

## License / ownership

Proprietary — Astra Matrix, Inc. Repository: [ALaustrup/VYBZ](https://github.com/ALaustrup/VYBZ).
