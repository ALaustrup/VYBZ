# MYVYB

> Secrets, beautifully hidden.

MYVYB is a premium, mobile-first **PWA** for **anonymous confessions and social
discovery**. The crowd **Fails** content it doesn't want and **Vybs** content it
loves — those votes decide what surfaces and what gets buried, and shape the
communities that form around shared taste. Connect with a confession and you
unlock its comments and a private line to the poster.

**Live:** https://myvybsocial.vercel.app

> 📐 **Full architecture & feature reference:** see
> [`ARCHITECTURE.md`](./ARCHITECTURE.md) — the authoritative, up-to-date guide to
> the stack, routes, state, the "Smoked Glass" design system, every feature
> (feed, compose/AI visuals, chat hub + rooms/circles, profiles, V¢ economy,
> games, VR mode), the Supabase backend, security, and deployment.

## Tech stack

- **React 18** + **TypeScript**, **Vite 6** (installable PWA via `vite-plugin-pwa`)
- **Tailwind CSS 3** — ultra-dark, neon-accented design system
- **Framer Motion** — 60fps swipe physics, ripples, transitions
- **Supabase** (optional) — Postgres + Auth + Realtime + Storage
- **lucide-react** iconography

The app runs **fully offline / local-first** with curated demo data; Supabase
upgrades it into a real multi-user product without breaking the local path.

## Core experience

| Gesture | Result |
| --- | --- |
| Swipe left | **Fail** — the crowd buries it; enough Fails blur it for everyone |
| Swipe right | **Vyb** — a positive signal that boosts the post |

- **Inverted, community-driven blur** — media is **clear by default**. Net Fails
  (Fails minus Vybs) progressively blur a post for everyone at 15 / 30 / 75 /
  150 / 300, fully burying it at 300. Server-authoritative; Godmode votes 5×.
- **No categories** — posting is just words + an optional photo.
- **Emoji identities** — your in-app identity is a unique **2–4 emoji** sequence
  (curated allowlist, canonical uniqueness, consistent Twemoji rendering), used in
  rooms, DMs, friends, and your profile. Confessions stay anonymous (ephemeral
  per-post alias). Auth stays separate (anonymous + optional email link).
- **NSFW by consent, not enforcement** — an AI scan (OpenAI moderation) only
  *suggests* NSFW: flagged media gets an `NSFW` badge + soft blur that any user
  can personally **Unveil**, or auto-clear via a global opt-in (off by default,
  set at sign-up / in Settings).
- **First-run tutorial**, **Local** geo feed, **Trending** (with filters), the
  **Games** center, notifications, friendships, procedural artwork, confetti.
- **Public chat rooms** — tabbed, mobile-first rooms open to everyone (including
  anonymous accounts), with a live "People (N)" presence list and shared images
  (clear by default; NSFW per-user). A **disclosed `<MOD>` agent** ("MYVYB
  Guide") moderates and chimes in transparently.
- **MYVYB XR** — an immersive **WebXR** edition at `/xr` (Three.js + native
  WebXR), tuned for **Quest 2/3**: stand inside a fog-wrapped void and Fail/Vyb
  confessions floating around you. Desktop gets a draggable 3D preview. See
  [`QUEST_XR.md`](./QUEST_XR.md) to package it for the Meta Horizon Store.
- **Trust & Safety** — 18+ age gate, report + block with report-driven auto-hide,
  and a gentle, non-blocking crisis-support banner in the composer.
- **Real friendships & DMs** — profile-to-profile friend requests (add people
  from rooms or posts) with realtime accept, plus 1:1 direct chat with friends.
- **Durable accounts** — anonymous by default; attach an email to recover your
  veil on any device (the account id never changes).
- **MYVYB Plus "Godmode"** — one-time **$3.69** upgrade: unlimited messaging,
  Power Ups, spotlights, and 5× votes. **All sales are final — no refunds.**
- **Public policies** — Terms, Privacy, Refund Policy, and Community Guidelines
  are always reachable at `/legal/*` (linked from onboarding, the paywall, and
  the profile footer). Content lives in `src/data/legal.ts`.

## Getting started

```bash
cd apps/veiled
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build to dist/
```

## Project structure

```
src/
  components/   reusable UI (SwipeCard, SafetyMenu, Tutorial, sheets, nav, ...)
  data/         demo confessions, notifications, rooms, auras, battles
  pages/        Feed, Local, Rooms, Trending, Games, Profile, Notifications
  store/        AppStore — state, reactions, veil tally, safety, entitlement
  lib/          backend (Supabase), safety, geo, image helpers
supabase/
  schema.sql               tables, RLS, triggers (veil tally, auto-hide)
  functions/               Edge Functions (moderate-image, room-mod, stripe-webhook)
```

## Backend (optional — Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/schema.sql` in the SQL editor (tables, RLS, the reaction-tally
   trigger, reports/blocks, and report-driven auto-hide).
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see `.env.example`).

When those vars are present, `src/lib/supabase.ts` sets `BACKEND_ENABLED` and the
app uses real accounts, shared confessions, realtime chat/comments, and storage.

### Edge Functions

```bash
# AI NSFW suggestion for uploaded images (OpenAI moderation — free)
supabase functions deploy moderate-image
supabase secrets set OPENAI_API_KEY=sk-...

# Disclosed room moderation agent ("MYVYB Guide", shows a <MOD> badge)
supabase functions deploy room-mod --no-verify-jwt
supabase secrets set MOD_SECRET=...   # then wire the room_mod_trg trigger (schema.sql)

# Stripe webhook — authoritative Godmode entitlement
supabase functions deploy stripe-webhook --no-verify-jwt
supabase secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_WEBHOOK_SECRET=whsec_... SERVICE_ROLE_KEY=...
```

### Branded auth emails

When a user links an email (durable account), Supabase sends a confirmation. We
set the **Site URL / redirect allow-list** to `myvybsocial.vercel.app` so the link
re-opens the app directly (not `localhost`).

Customising the email *body* (the branded "Welcome to MYVYB" template in
`supabase/email-templates/confirm.html`) requires a **custom SMTP sender** — on
the free tier Supabase won't let you edit templates with its default mailer. Once
you have a sender (Resend recommended — free tier, verify a domain like
`myvybsocial.vercel.app`), apply everything in one shot:

```bash
SUPABASE_ACCESS_TOKEN=sbp_... SUPABASE_PROJECT_REF=<ref> \
SMTP_HOST=smtp.resend.com SMTP_PORT=465 SMTP_USER=resend SMTP_PASS=<api-key> \
SMTP_SENDER_EMAIL="hello@myvybsocial.vercel.app" SMTP_SENDER_NAME="MYVYB" \
node supabase/configure-email.mjs
```

## Monetization (MYVYB Plus / Godmode)

Checkout uses a **Stripe Payment Link** (`VITE_STRIPE_PAYMENT_LINK`); the app
appends the account id as `client_reference_id`. The `stripe-webhook` function
verifies the `checkout.session.completed` signature and sets `profiles.godmode`,
which the client reads on bootstrap — so entitlement is **server-verified and
cross-device**. With no link configured, a labeled demo unlock runs instead.

## Deploying to Vercel

`vercel.json` sets the Vite preset, `dist` output, SPA rewrites, and asset
caching. Production domain: **myvybsocial.vercel.app**.

```bash
cd apps/veiled
vercel --prod                       # production deploy
vercel alias set <deployment-url> myvybsocial.vercel.app
```

Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_STRIPE_PAYMENT_LINK`
as project environment variables in Vercel.

## Design language

- Deep layered blacks (`ink`), rich violets (`veil`), neon accents
- `feel` (Vyb / green) and `shroud` (Fail / indigo) reaction colors (internal
  token names kept stable)
- Constrained to a phone-sized column, centered on desktop; respects
  `prefers-reduced-motion`

© MYVYB by Astra Matrix, Inc.
