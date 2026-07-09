# VYBZ

> **Find Yours.**

VYBZ is the next-generation, **identity-first** platform for finding music
collaborators and exchanging the raw materials of production — samples, stems,
one-shots, presets, MIDI, and full DAW project files. Its reason to exist is
**precision matchmaking between creators and whatever they're looking for**, plus a
protected, frictionless exchange to build together.

**VYBZ has no anonymity.** Every account is a real, durable creator identity.

> 📐 See [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md) for the authoritative product +
> engineering plan, and [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the technical map.

## What's here (v1)

- **Identity + auth** — email + password onboarding, then claim your username. No guest
  tier (passkey sign-in is planned).
- **Creator profiles** — the roles you *offer* and *seek* (with skill), genres, DAWs,
  plugins, influences, tempo/keys, and per-facet privacy.
- **Precision matchmaking** — complementary-role matching blended with genre/DAW/plugin/
  tempo overlap + semantic resonance, with the "why" behind every match. Surfaced on
  **Connect** and as a **Spark** swipe deck.
- **Opportunity board** — post/find open roles and apply.
- **Sound-first feed of "drops"** — upload audio (any format, lossless preserved),
  waveform previews, a global always-on player, seeded audio-reactive visualizers,
  Vyb/Fail, and star ratings.
- **Connections + 1:1 DMs** between creators who connect.

## Tech stack

- **React 18** + **TypeScript** + **Vite 6** (installable PWA; Capacitor Android target)
- **Tailwind CSS 3** — the "Smoked Glass" dark, neon-accented design system
- **Framer Motion**, **lucide-react**
- **Supabase** — Postgres 17 + Auth + Storage + Edge Functions (client uses the anon key
  + Row-Level Security; privileged logic runs in `SECURITY DEFINER` RPCs)
- A single global **`AudioBus`** (shared `AudioContext` + analyser) powers all playback
  and the audio-reactive visuals

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc --noEmit + production build to dist/
```

Create `.env.local` with the VYBZ Supabase project credentials:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Apply the schema (in `supabase/migrations/20260709_*.sql`) to your Supabase project.
Anonymous sign-in must stay **disabled**; email verification can be enabled before
public launch.

## Deploying

Vercel (Vite preset, `dist` output, SPA rewrites). Production domain:
**vybz.astramatrix.xyz**. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as
project environment variables.

© Astra Matrix, Inc.
