# MYVYB — Platform Architecture & Feature Reference

> **MYVYB** — _“Secrets, beautifully hidden.”_
> A high-end, mobile-first, installable (PWA) social platform for **anonymous
> confessions**. Post a veiled photo/video or AI-generated visual with a deeply
> personal confession; others swipe to **Feel** (boost) or **Veil** (bury) it.
> Conversations live in 1:1 DMs, public **Rooms**, and user-created **Circles**,
> with a token economy (**V¢**), nano-games, next-gen profiles, passkey sign-in,
> an operator console, and an immersive **VR** mode.

This document is the single source of truth for how the app is built and what it
does. It reflects the code under `apps/veiled/`.

---

## 1. Tech stack

| Layer | Choice |
| --- | --- |
| UI | **React 18** + **TypeScript** |
| Build/dev | **Vite 6** |
| Styling | **Tailwind CSS 3** (custom “Smoked Glass” theme) |
| Animation | **Framer Motion 11** |
| Routing | **React Router 6** |
| State | Single React Context store (`src/store/AppStore.tsx`) + `localStorage` |
| 3D / VR | **Three.js** + native **WebXR** (`immersive-vr`) |
| PWA | `vite-plugin-pwa` (Workbox) |
| Auth (biometric) | **WebAuthn** via `@simplewebauthn/*` |
| Backend (optional) | **Supabase** (Postgres + RLS, Auth, Realtime, Storage, Edge Functions) |
| AI visuals | **Pollinations/FLUX** (keyless), optional **OpenAI** images |
| AI moderation | **OpenAI** `omni-moderation-latest` |
| Payments | **Stripe** (one-time “Godmode”) |
| Hosting | **Vercel** (project `veiled`, root dir `apps/veiled`) |

### Local-first / offline mode
The app is **fully functional with no backend**. When `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` are unset, `BACKEND_ENABLED` is `false`, state persists
in `localStorage`, and seeded demo data drives every screen. Supplying the env
vars upgrades the app to a real multi-user backend feature-by-feature. AI visual
generation works **without any backend** via the keyless Pollinations fallback.

---

## 2. Repository layout

```
apps/veiled/
├── index.html                # SEO/OG/Twitter/JSON-LD meta, favicons, theme color
├── vite.config.ts            # Vite + PWA (autoUpdate, clientsClaim, skipWaiting)
├── tailwind.config.js        # Smoked Glass palette, fonts, shadows, keyframes
├── vercel.json               # SPA rewrites + /favicon.ico redirect + asset caching
├── public/                   # icons/, og.png, favicon.svg, robots.txt, sitemap.xml,
│                             # manifest.quest.webmanifest
├── QUEST_XR.md               # Meta Quest PWA packaging guide (Bubblewrap)
├── ARCHITECTURE.md           # (this file)
├── src/
│   ├── App.tsx               # Shell: routing, dynamic background, page transitions
│   ├── index.css             # Global CSS, .glass/.glass-panel, text-effect (.fx-*) CSS
│   ├── types.ts              # Domain types
│   ├── store/AppStore.tsx    # Centralized state + actions (the app’s brain)
│   ├── pages/                # Route screens (see §4)
│   ├── components/           # Reusable UI + overlays/sheets (see §5)
│   ├── lib/                  # Pure helpers + backend client (see §6)
│   ├── data/                 # Seed/demo data
│   └── xr/veiledXR.ts        # Three.js/WebXR scene
└── supabase/
    ├── schema.sql            # Postgres schema, RLS, triggers, RPCs (+ docs of applied objects)
    ├── functions/            # Edge Functions (Deno)
    ├── email-templates/      # Branded auth emails
    └── configure-email.mjs   # SMTP/template configuration script
```

---

## 3. Frontend architecture

### 3.1 Application shell (`src/App.tsx`)
- Constrains the app to a centered phone column (`max-w-md`), widening to
  `max-w-3xl` for chat **conversations** in landscape (see §7.7).
- Mounts the **living background** (`DynamicBackground`) behind a translucent,
  blurred column so it glows through and fills the margins on large screens.
- Wraps routed pages in the user’s chosen **page transition** preset.
- Public routes (`/legal`, `/xr`) render outside the gated shell so they work
  pre-sign-in / on a headset. Everything else is gated behind `Onboarding`.
- `ErrorBoundary` wraps routed content so a single page error never blanks the app.

### 3.2 State (`src/store/AppStore.tsx`)
One `AppProvider` exposes all state and actions via `useApp()`. Highlights:
- Identity/account (emoji identity, anonymous flag, optional public Identity).
- Reactions & community veil (`recordSwipe`, `displayLevel`, NSFW reveal).
- Social (friends/connections, DMs, comments, inbox, notifications).
- Economy (`credits`, `tip`, `buyCosmetic`, `spendCredits`, `awardGameCredits`).
- Personalization (`bgVariant`/`setBgVariant`, `pageTransition`/`setPageTransition`,
  `cosmeticLoadout`/`equipCosmetic`, `musicUrl`).
- Premium (Godmode), admin, NSFW gate, passkeys.
- Refs mirror state so imperative actions read fresh values without re-binding.
- `localStorage` persists everything under `veiled.*` keys; when a backend is
  configured, profile fields hydrate/sync and `onAuthChange` keeps sessions live.

### 3.3 PWA
`vite-plugin-pwa` with `registerType: autoUpdate`, `cleanupOutdatedCaches`,
`clientsClaim`, and `skipWaiting` so new deploys take control immediately
(prevents stale-cache “old version” reports). Installable on iOS/Android; a
separate `manifest.quest.webmanifest` targets Meta Quest (`start_url: /xr`).

---

## 4. Routes & pages

| Route | Page | Purpose |
| --- | --- | --- |
| `/` | `FeedPage` | Swipe feed (Feel/Veil) + Wall/Stack/Reader views |
| `/local` | `LocalPage` | Geo-local confessions (approximate-only) |
| `/chat` | `ChatHubPage` | **Unified hub**: Rooms (cards) + Circles (My/Discover) |
| `/rooms?room=<id>` | `RoomsPage` | A single public room chat (landscape two-column) |
| `/circles` | → redirect to `/chat` | Legacy path |
| `/circles/:id` | `CircleChatPage` | A circle’s chat (landscape two-column) |
| `/trending` | `TrendingPage` | Top confessions |
| `/profile` | `ProfilePage` | **Tabbed** profile: Posts / Friends / About |
| `/u/:id` | `UserProfilePage` | Public profile (stats, posts, music, tip) |
| `/notifications` | `NotificationsPage` | Tappable activity → routes to content/DM |
| `/play` | `GamesPage` | Veilfall nano-game |
| `/admin` | `AdminPage` | Operator console (role-gated) |
| `/xr` | `XRPage` | Immersive **VR** (Quest) + interactive 3D preview |
| `/legal`, `/legal/:doc` | `LegalPage` | Terms, Privacy, Refunds, Guidelines |
| `*` | → `/` | Fallback (old `/arena`, `/categories` removed) |

---

## 5. Key components (`src/components/`)
- **Navigation/shell**: `TopBar`, `BottomNav` (macOS-style magnifying glowing
  dock), `DynamicBackground` (touch-reactive canvas), `Intro`, `Tutorial`,
  `InstallPrompt`, `Toast`, `Confetti`, `ErrorBoundary`.
- **Feed/cards**: `SwipeCard`, `WhisperCard` (text-over-media, tile/full/reader),
  `VeiledArt` (procedural art), `VeiledPhoto`, `VeiledVideo`, `Gyro3D`
  (gyroscopic/parallax media view).
- **Compose**: `ComposeSheet` (text → fonts → effects → unified media), `VideoTrimmer`.
- **Identity**: `EmojiId` (Twemoji render), `EmojiPicker`, `IdentitySettings`,
  `IdentityMeta`, `SecureAccount`, `AboutYou` (in `ProfilePage`).
- **Social**: `ConnectionSheet` (comments/DMs), `FriendChatSheet`, `InboxSheet`,
  `PostSheet`, `SafetyMenu` (report/block).
- **Economy/premium**: `CreditsShop`, `TipButton`, `PremiumSheet`.
- **Safety**: `NsfwGate` (verified-contact + 18+ consent).
- **Auth**: `PasskeySetup`.
- **Games**: `VeilfallGame`.
- **Legal**: `LegalLinks`, `Copyright`.

---

## 6. Library modules (`src/lib/`)
- `supabase.ts` — optional client + `BACKEND_ENABLED`.
- `backend.ts` — typed wrappers over Supabase (auth, confessions, reactions,
  rooms, circles, DMs, economy, cosmetics, games, admin, passkeys, AI). No-ops
  cleanly in local mode.
- `aiVisual.ts` — AI styles, safe prompt builder, **client-side Pollinations
  fallback**, local NSFW keyword guard.
- `expression.ts` — font styles (free) + premium text effects + 3D-view cost helpers.
- `cosmetics.ts` — V¢ cosmetic loadout → classes/gradients; circle themes.
- `backgrounds.ts` — living-background variants (Aurora free; others Godmode).
- `transitions.ts` — page-transition presets (Fade free; others Godmode).
- `emoji.ts` — emoji identity allowlist, canonicalization, Twemoji URLs,
  `emojiHandleFor`, legendary set (Godmode).
- `media.ts` / `image.ts` — image→WebP processing, video probe/trim helpers.
- `music.ts` — embeddable player URL parsing (Spotify/YouTube/SoundCloud/Apple).
- `passkey.ts` — WebAuthn register/sign-in helpers.
- `safety.ts` — crisis-keyword detection + helpline resources.
- `geo.ts` / `useGeolocation.ts` — approximate-only geolocation (snapped ~1km).
- `usePresence.ts`, `useMediaQuery.ts` — realtime presence; responsive layout switch.
- `utils.ts` — `cx`, veil thresholds/clarity, palettes, `avatarGradient`, `haptic`.

---

## 7. Feature set

### 7.1 Onboarding & emoji identity
- All-ages (13+) entry; no 18+ wall. Frictionless: “Enter anonymously” or
  “Unveil yourself”.
- Identity is a **2–3 emoji sequence** (curated allowlist, canonicalized for
  uniqueness, rendered with Twemoji), not a text username. “Surprise me”
  guarantees an available handle. Godmode unlocks a **legendary** emoji set.
- Optional, **permanent** self-disclosure: gender (M/F), age, location, with a
  public/private toggle (one-time self-change; admin override).
- Inactivity: after ~7 days with no login, an account’s emoji name is freed and
  its content is **MYVYB** (archived from public feeds). Email-linked Godmode
  members can reactivate. A **name watchlist** notifies watchers when a name frees.

### 7.2 The feed & the Feel/Veil mechanic
- Swipe right = **Feel** (boost), left = **Veil** (bury). Godmode votes count 5×.
- **Community veil**: net Veils progressively blur a confession **for everyone**
  at thresholds **15 / 30 / 75 / 150 / 300** (300 = fully “MYVYB”). `displayLevel`
  combines community clarity with per-user NSFW state.
- Views: **Wall** (default), **Stack** (swipe), **Reader** (calm, text-only).

### 7.3 Compose (`ComposeSheet`)
Flow, top→bottom: **confession text → font style → effects → media**.
- **Fonts** (free): Clean / Serif / Typewriter / Wide / Whisper.
- **Premium expression** (V¢, free for Godmode): text effects (Shimmer, Neon,
  Flicker, Rise) + **3D gyroscopic** media view. Charged via `spend_credits` at post.
- **Media (one section)**: AI generation with an optional manual “describe a
  visual” prompt + style chips (Dreamy/Noir/Neon/Cosmic/Vintage/Ink), **or**
  upload a photo/video (image→WebP; video virtual-trim to ≤15s). AI images are
  preloaded before reveal so the card never flashes empty.
- NSFW self-mark for uploads; non-blocking crisis-support card on heavy text.

### 7.4 NSFW handling (suggest, never enforce)
- AI **suggests** NSFW (badge + soft blur); each user can personally **Unveil**.
- Global opt-in is **off by default** and gated behind a **verified contact
  (email magic link) + 18+ consent** (`NsfwGate`).

### 7.5 Profiles
- **Own profile** (`/profile`): sticky **stats portfolio** header (Confessions /
  Feels / Resonance) + reputation/Godmode chips, then **tabs**:
  - **Posts** — Veil reputation (karma → reach), stats, analytics, your confessions.
  - **Friends** — requests, friends, connections.
  - **About** — account settings, membership, **Living background** + **Page
    transition** personalization, profile music, NSFW toggle, passkeys, sign out, legal.
- **Public profile** (`/u/:id`): identity header, stats, public posts, music
  embed, **Tip** button, and equipped V¢ cosmetics (font/border/theme/shimmer/sparkle).

### 7.6 Friends, connections & DMs
- Friend requests/accept/decline; profile-to-profile **connections** from rooms/posts.
- 1:1 DMs (`FriendChatSheet`, `ConnectionSheet`) gated by engagement; message caps
  for free users, unlimited + “Power Up” gifting for Godmode. Emoji handles everywhere.

### 7.7 Unified Chat hub, Rooms & Circles
- **Hub (`/chat`)**: one searchable screen with a **Rooms / Circles** toggle.
  Rooms are a clean card grid (no horizontal tab scrolling); Circles offer
  My/Discover + search + create. A single **Chat** dock entry covers all of it.
- **Rooms**: always-on public lobbies; open one via `?room=<id>` with a
  back-to-hub header, Chat/People, disclosed **MOD** agent, per-user NSFW image reveal.
- **Circles** (user communities, 5 free / 15 Godmode):
  - **Phase A**: create/join/leave/send, membership-enforced RLS, anonymous
    read/chat (owner-togglable “Unveil Anonymous”).
  - **Phase B**: join policies (Open/Request/Code), approval queue, per-circle
    SQL safety agent, live hide-sync, typing indicators.
  - **Phase C**: optional V¢ daily dues (opt-in support), tip owner, **18+
    verified** circles, premium themes + Godmode vanity slug.
- **Landscape**: room & circle chat switch to a **two-column** layout (conversation
  + members) and the shell widens to `max-w-3xl`; portrait keeps tabbed Chat/People.

### 7.8 V¢ (V-Credits) economy
- Non-cashable, cosmetic-only. Earn **+10/post**, **+5 daily**, capped game
  rewards. Spend on cosmetics, **tip** anyone (post/profile), or premium post
  effects (`spend_credits`). Anonymous accounts have no wallet. All server-side
  balance-checked (`SECURITY DEFINER` RPCs).

### 7.9 Games — Veilfall (`/play`)
- Canvas endless reflex game (catch whispers, dodge veils), cross-platform
  (mobile/desktop/Quest browser), scaling V¢ rewards (server-capped 50/play,
  200/day), achievements showcased on public profiles.

### 7.10 Personalization
- **Living background**: touch-reactive “heat-paint” canvas; variant Aurora (free)
  + Ember/Tide/Ink/Rose (Godmode).
- **Page transitions**: Fade (free) + Slide/Zoom/Veil (Godmode).
- **macOS-style dock**: glowing, icon-first, magnifies toward the finger.
- **Cosmetics** (V¢): fonts, borders, themes, shimmer, sparkle flair.

### 7.11 VR mode — MYVYB XR (`/xr`)
- Vanilla **Three.js + WebXR** “veil gallery”: confessions float on a ring; point
  a controller, **Trigger = Feel**, **Grip = Veil** (with haptics).
- **Quest-optimized**: `immersive-vr`, `local-floor`, foveation, reduced
  framebuffer, comfort **snap-turn**, in-scene help panel, focus highlight.
- Ambiance matches the 2D app (Smoked Glass + the user’s background accent).
- **Interactive preview** on desktop/phone: drag to look, **tap a card to Feel**.
- Packageable for Meta Quest via Bubblewrap (`QUEST_XR.md`).

### 7.12 Safety, moderation & admin
- Report/block (`SafetyMenu`); report auto-hide trigger; crisis-keyword support;
  disclosed MOD agents in rooms/circles; image moderation Edge Function.
- **Admin console** (`/admin`, role-gated via one-time claim code): review/hide/
  restore reports, search users, grant/revoke Godmode, ban/unban, set/grant
  identity changes, compose/schedule posts as any identity.

### 7.13 Auth
- Anonymous sessions; passwordless **email magic-link**; **passkeys (WebAuthn)**
  for biometric, phishing-resistant sign-in (session bridged via Edge Function +
  `admin.generateLink`/`verifyOtp`). Email-anchored accounts enable recovery.

---

## 8. Visual design system — “Smoked Glass”
- **Palette**: refined charcoal/graphite base (`ink.950 #0a0b0f` …) instead of
  pure black; signature violet (`veil`) + iridescent teal (`aqua`) accents.
- **Glass**: `.glass` / `.glass-panel` frosted dark panels (blur + saturation +
  top highlight); the app column is translucent over the living background.
- **Type**: device-native font stacks (SF Pro / Segoe UI / Roboto) — zero web-font
  cost; tasteful `tracking-tightish`.
- **Motion**: restrained glows, spring-eased dock/tabs, `prefers-reduced-motion`
  respected throughout (background, effects, dock, 3D).
- **Text effects CSS**: `.fx-shimmer/.fx-glow/.fx-flicker/.fx-rise` in `index.css`.

---

## 9. Backend (Supabase) — `supabase/`

> The app runs without this; it’s the optional multi-user upgrade. `schema.sql`
> contains the core schema, RLS, triggers, and RPCs. Some later objects (V¢
> economy, cosmetics, circles, games) were applied directly to the live project
> and are **documented in `schema.sql` comments**; `spend_credits` is versioned
> inline as the pattern reference.

### 9.1 Core tables (RLS-protected)
`profiles`, `confessions`, `reactions`, `unveils`, `comments`, `messages`,
`friendships`, `name_watchers`, `passkeys`, `webauthn_challenges`, `reports`,
`blocks`, `rooms`, `room_messages`, `room_message_reactions`, `app_secrets`,
`admin_actions`, plus (applied to project) `credit_ledger`, `cosmetics`,
`cosmetics_owned`, `game_scores`, `achievements`, `circles`, `circle_members`,
`circle_messages`.

Notable `confessions` columns: `alias`, `body`, `photo_url`, `media_kind`,
`clip_start/clip_end`, `ai_visual`, `nsfw`, `archived`, `publish_at`,
`author_gender/age/location` (snapshot only when public), and expression fields
**`font_style`, `text_fx`, `view_3d`**.

### 9.2 Triggers & functions (selection)
`tally_reaction` (feels/wilds), `bump_report_count` (auto-hide), `is_admin`,
`lock_permanent_identity` (permanent sex/age w/ GUC bypass), `notify_room_mod`,
`tally_room_reaction`, `veil_inactive_accounts` (pg_cron archival + free name),
plus economy/circle RPCs: `claim_daily_bonus`, `tip_credits`, `buy_cosmetic`,
**`spend_credits`**, `award_game_credits`, `grant_achievement`, circle
create/join/leave/send/settings/dues/theme/slug/access RPCs, and admin RPCs
(`admin_set_godmode/banned/hidden`, `admin_change_identity`, `self_change_identity`, …).

### 9.3 Realtime, Storage
- Realtime `postgres_changes` + Presence + Broadcast power live chat (rooms,
  circles, DMs), comments, presence rosters, typing indicators, and hide-sync.
- Storage bucket `confessions` holds uploaded media and AI visuals.

### 9.4 Edge Functions (`supabase/functions/`, Deno)
| Function | Role |
| --- | --- |
| `generate-background` | AI visual (text-moderate → Pollinations/FLUX; optional OpenAI) |
| `moderate-image` | OpenAI image moderation → NSFW suggestion |
| `passkey` | WebAuthn register/authenticate + session minting |
| `room-mod` | Disclosed moderation agent (keyword + LLM tips) |
| `name-drop-notify` | Emails watchers when an emoji name frees |
| `stripe-webhook` | Verifies Godmode entitlement server-side |

---

## 10. Security & privacy
- **Anonymous by design**: confessions carry only an ephemeral emoji alias; the
  author’s identity snapshot is written **only when the profile is public**.
- **Geolocation**: approximate-only (`enableHighAccuracy:false`), snapped to ~1km
  on-device; precise coordinates are never stored.
- **RLS everywhere**; privileged actions go through `SECURITY DEFINER` RPCs with
  balance/role checks; banned users can’t post.
- **Age model**: 13+ app; NSFW gated behind verified contact + 18+ consent.
- **No dark patterns**: no infinite algorithmic feed, no shadowbans (reputation
  is transparent), refunds policy and legal docs are public (`/legal`).

---

## 11. Configuration & deployment

### 11.1 Environment variables (`.env` — see `.env.example`)
```
VITE_SUPABASE_URL=         # optional; enables the backend
VITE_SUPABASE_ANON_KEY=    # optional
```
Edge Function/server secrets (set in Supabase): `OPENAI_API_KEY`,
`USE_OPENAI_IMAGES`, `RESEND_API_KEY`/SMTP, `DROP_SECRET`, Stripe keys, etc.

### 11.2 Build & run
```bash
npm install
npm run dev        # local dev (Vite)
npm run build      # tsc --noEmit && vite build
npm run preview    # serve the production build
npm run lint       # tsc --noEmit
```

### 11.3 Hosting
- **Vercel** project `veiled`, root directory `apps/veiled`, framework Vite,
  SPA rewrites + `/favicon.ico → /favicon.svg` redirect (`vercel.json`).
- **PWA** auto-updates; **Meta Quest** packaging via `manifest.quest.webmanifest`
  + Bubblewrap (`QUEST_XR.md`).
- **SEO**: full `<head>` metadata, Open Graph, Twitter cards, JSON-LD,
  `robots.txt`, `sitemap.xml`, Google Search Console verification.

---

## 12. Alpha scope & non-goals
In scope: accounts & age layers, geo-first discovery, profiles-as-rooms, 1:1 chat,
small group rooms/circles, basic moderation, observability, plus the expression,
economy, games, and VR layers above. Out of scope (per product governance):
video chat, stranger-cam roulette, marketplace, TURN/SFU infrastructure, infinite
engagement-bait feeds, and growth dark patterns.

---

_© MYVYB by Astra Matrix, Inc._
