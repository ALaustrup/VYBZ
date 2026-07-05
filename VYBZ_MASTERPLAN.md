# VYBZ — Master Build Bible

> ## **VYBZ: Find Yours.**

**Audience:** the LLM/engineer building **VYBZ** in the `vyb-audio` repository (forked from `myvybsocial`; the repo keeps its technical name — the *brand* is **VYBZ**).
**Author:** technical lead for GitHub user `Alaustrup`.
**Domain:** everything for this project lives at **`vybz.astramatrix.xyz`** — hosting, auth redirect URLs, email links, SEO canonical, sitemap. No other subdomain.
**Status:** authoritative. If this document conflicts with an assumption you hold, this document wins. When something is genuinely ambiguous, prefer the option that is (a) secure by default, (b) additive/non-breaking, and (c) consistent with the inherited conventions described in §3.

**Ambition check (read twice):** VYBZ must be the **next-generation, elite platform** for finding and seeking production collaborations. Two promises define every decision: (1) **matchmaking precision no other platform can touch**, and (2) **the creative-expression unlock every creator has dreamed of** — delivered professionally, never childishly. If a feature doesn't serve one of those two promises, it doesn't ship.

---

## 0. What VYBZ IS (and is NOT)

**VYBZ is a next-generation social + collaboration network for musicians and producers.** Its single reason to exist is **precision matchmaking between creators and whatever they are looking for**, plus a **frictionless exchange of raw creative materials** (samples, stems, one-shots, presets, MIDI, and full DAW project files).

**It IS:**
- A **complementary-role matching engine.** A drummer seeking a pianist is matched to pianists seeking drummers; a vocalist seeking a band is matched to bands seeking a vocalist; a guitarist seeking a beatmaker is matched to beatmakers seeking a guitarist. Every direction of every pairing that can exist, matched with high precision. Matchmaking is **always the first-class citizen** — every new data point, upload, or interaction should feed the algorithm.
- A **workbench exchange.** Trade samples and **project files for DAWs** (Ableton `.als`, FL Studio `.flp`, Logic `.logicx`, Pro Tools `.ptx`, Reaper `.rpp`, Studio One `.song`, Bitwig `.bwproject`, Cubase `.cpr`), stems, and MIDI — to *build together*, not to sell.
- A **collaboration graph:** opportunities boards, collab rooms, split sheets, credits, versioned project handoffs.
- A **sound-first social feed.** Unlimited sample/clip uploads per profile, public review + comments + an embedded rating mechanism on every track (§6), delivered through a hybrid cloud + **P2P distribution layer** (§8.6) so scale never caps creativity.
- A **protected exchange.** Every audio file on the platform is cryptographically safeguarded against theft and piracy (§8.7) — creators share fearlessly because the platform has their back.
- A **living, audio-reactive canvas.** The entire platform reacts in real time to whatever the user is playing (§6.5) — a subtle neon pulse that makes VYBZ instantly unforgettable, plus per-track generative visualizers that make every posted track visually unique (§6.6).
- A **VST-aware network.** Plugins are a first-class profile facet and matchmaking/search signal (§5.5) — the tools creators actually use become the vocabulary they connect through.

**Brand voice (memorize):** copy is **minimal**. The platform speaks in as few words as possible, always geared toward *finding collabs and sharing samples with the creators seeking them*. The tagline is **"VYBZ: Find Yours."** — that economy of language is the standard for every string in the product. No paragraph where a phrase will do; no phrase where a word will do.

**It is NOT:**
- **Not "the next SoundCloud."** It is not a streaming/showcase/consumption platform, and it is not a store. Nothing here is about selling songs to listeners or racking up plays. Discovery exists **only** in service of *making a connection or a collaboration happen*.
- Not a label, not a DSP, not a beat marketplace.

Keep this framing in every product decision: **"Does this help two creators find each other or exchange the raw material to build something? If not, it does not belong."**

---

## 1. How to use this document

1. Read §2 (mission-critical positioning) and §3 (the inherited foundation) fully before writing any code. You are **forking a real, production app** — most of what you need already exists.
2. Execute in the phase order of §12. Each phase has a **Definition of Done**. Do not advance until the current phase's DoD passes `npm run build` (which runs `tsc --noEmit`) and manual smoke tests.
3. Obey the **Development Rules** in §11 on every change.
4. The matchmaking engine (§7) is the heart of the product. Treat it as the highest-value, highest-rigor work.
5. Everything is **additive and reversible**. Never break a working feature to add a new one.

---

## 2. Positioning tenets (memorize)

- **Precision over volume.** Better to show 5 truly complementary creators than 500 vaguely similar ones.
- **Mutual by construction.** The best match is a *two-way complement*: I have what you seek and you have what I seek.
- **Exchange, not commerce.** Uploads are creative fuel for collaboration, shared freely (with optional credit/splits), not sold.
- **Global legibility.** Roles, genres, and DAWs are curated, controlled vocabularies so overlap is meaningful across languages and scenes.
- **Privacy-respecting.** Users can keep sensitive profile facets private; private facets still quietly improve *their own* matches but are never exposed.

---

## 3. The inherited foundation (what you already have)

You are forking **MYVYB** (`myvybsocial`), a mature, production social platform. **Do not rebuild these — reuse them.**

### 3.1 Tech stack (keep exactly)
- **Frontend:** Vite 6 + React 18 + TypeScript 5.6 (strict), Tailwind 3, `framer-motion`, `react-router-dom` 6, `lucide-react`.
- **Path alias:** `@/` → `src/`.
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime + Edge Functions).
- **Live video/audio:** LiveKit (`livekit-client`).
- **3D/immersive:** Three.js (lazy-loaded XR).
- **Native:** Capacitor 8 (Android target), `vite-plugin-pwa` (installable PWA).
- **Auth hardening:** `@simplewebauthn/browser` (passkeys).
- **Build/lint:** `npm run build` = `tsc --noEmit && vite build`; `npm run lint` = `tsc --noEmit`.

### 3.2 Database — core objects that already exist
> Source of truth: `supabase/migrations/*.sql`. All migrations are **idempotent** (`create ... if not exists`, `create or replace`) and timestamp-named.

- **`profiles`** — the central identity row. Columns include: `id` (uuid, = auth user), `username` (unique, case-insensitive), `alias`, `emoji_key`, `aura`, `gender`, `age`, `location` (free text), `identity_public` (bool), `godmode` (bool, premium), `is_admin` (bool), `banned` (bool), `anonymous` (bool, guest), `cosmetic_loadout` (jsonb), `music_url`, `prefs` (jsonb), `created_at`, `last_active_at`, and — critically — **`profile jsonb`**: an owner-private "data points" blob (interests, lookingFor, languages, prompts, traits, bio, pronouns, plus a `_hidden` array marking private keys). Indexed with a GIN index (`profiles_profile_gin`).
- **`confessions`** — the "post" table (body, `photo_url`, `media_kind`, `nsfw`, `seed`, `author_id`, `alias`, `publish_at`). *In VYBZ this becomes the generic content/drop table — see §6.*
- **`reactions`** — per-user reaction to a post: `reaction in ('feel','wild')` (Vyb/Fail). Powers behavioural matchmaking.
- **`friendships`** — `requester_id`, `addressee_id`, `status` ('friends', etc.). Symmetric connection graph.
- **`dating_likes` / `dating_matches`** — swipe layer ("Spark"): like/pass, symmetric match on reciprocation.
- **`profile_embeddings`** — pgvector `vector(1536)` per user (OpenAI `text-embedding-3-small`) for **semantic resonance** matching. Written server-side only.
- **`companions` / `companion_memory`** — AI companions with pgvector RAG memory.
- **`live_streams`** (+ analytics, moderation, recording, saved vybs) — LiveKit-backed live layer.
- **`roulette_queue` / `roulette_sessions`** — random 1:1 chat, age-layer segregated.
- **`game_scores`**, **`push_subscriptions`**, **`admin_actions`**, **`app_secrets`**, **`name_watchers`**, plus storage buckets `media-public` (public) and `confessions` (private).

### 3.3 The matchmaking engine you inherit (STUDY THIS — you will extend it)
`public.user_matches(p_limit int)` has evolved v1→v4 (see `20260624_0002_matchmaking_v2.sql`, `20260627_0002_profile_datapoints.sql`, `20260628_0003_semantic_layer.sql`). It is a **`SECURITY DEFINER` SQL function** that blends multiple signals into a single `affinity` (0..1):

| Signal | Source | Weight (v4) |
|---|---|---|
| co-Vyb (both loved a post) | `reactions` | ×1.0 |
| co-Fail (both rejected) | `reactions` | ×0.8 |
| disagreement | `reactions` | −0.6 |
| shared declared interests | `profile->'interests'` | ×1.1 |
| shared intent ("lookingFor") | `profile->'lookingFor'` | ×1.6 |
| **semantic resonance** | `profile_embeddings` cosine | ×3.0 |

Key patterns to imitate:
- Candidate pools are **UNION**ed from behaviour, declared-interest overlap, and vector-nearest — so brand-new users still match.
- The function reads even **private** profile keys (it runs as definer) but only **emits aggregates** (counts, names, %), never raw private values.
- Helpers `jsonb_overlap_count(a,b)` and `jsonb_overlap_names(a,b)` compute array intersections.
- Swipe deck: `dating_deck()`, `spark_like(target, like)`, `my_sparks()` — same definer discipline; raw like history is never client-readable.

**This architecture is exactly what VYBZ needs.** You will add a *role-complementarity* term and *music-domain* signals on top of it (§7).

### 3.4 Profile data-point catalog (the pattern to rewrite for music)
`src/lib/profileFields.ts` is the **single source of truth for BOTH the profile editor UI and the matching engine.** It declares `INTERESTS[]`, `CHOICE_FIELDS[]` (lookingFor, languages), `PROMPTS[]`, `TRAITS[]`, plus `completeness()` and `interestMatch()`. Every field marked `matchable: true` automatically feeds compatibility. **You will replace its *contents* with a music catalog (§9) while keeping its *shape*.**

### 3.5 Frontend structure
- **Routing** (`src/App.tsx`): `/` & `/local` & `/trending` → `FeedsPage`; `/foryou`; `/connect` → `MatchmakingPage`; `/spark` → swipe; `/rooms`; `/chat` & `/circles/:id`; `/profile` & `/you`; `/u/:id` (public profile); `/live` (lazy); `/xr` (lazy WebXR); `/admin`; `/legal/:doc`. Desktop = SideNav + content + ContextRail; mobile = TopBar + column + BottomNav.
- **State:** `src/store/AppStore.tsx` (large central store/provider, `useApp()`).
- **Backend wrappers:** `src/lib/backend.ts` (all Supabase calls, Edge-function invokes, matchmaking/spark wrappers).
- **Brand:** `src/components/Brand.tsx` (`BrandMark`, `Wordmark`, `BrandLockup` → `/brand/*.svg` with graceful fallback), `src/components/Copyright.tsx`.
- **Edge Functions** (`supabase/functions/*`): `email-code`, `passkey`, `embed`, `companion-chat`, `echo-chat`, `live-token`, `lifeline-token`, `room-mod`, `push-send`, `stripe-webhook`, `moderate-image`, `name-drop-notify`. **Every secret lives here, never in the client.**

### 3.6 What to KEEP as-is (high reuse, low change)
Auth (anonymous→durable email/passkey), the branded email pipeline (`supabase/configure-email.mjs` + `email-templates/confirm.html`), presence, friendships, chat/circles, live (LiveKit), push notifications, media guard/upload pipeline, admin console, moderation, PWA/Capacitor scaffolding, the matchmaking **core** (extend, don't replace), the swipe mechanic (repurpose for collab), per-page accent theming, XR (optional "listening room" later).

---

## 4. Freeze & Fork protocol (do this first, exactly)

**Goal:** `myvybsocial` must stay *exactly as it is*. VYBZ is a **separate repository with separate infrastructure**. There is **zero shared runtime** — never point VYBZ at MYVYB's Supabase project (schema divergence would corrupt MYVYB).

### 4.1 Protect the source (already partially done)
- An immutable freeze tag exists: **`v1.0.0-myvyb`**. This is the canonical restore point.
- Enable GitHub branch protection on `myvybsocial` `main` (requires repo admin):
  ```bash
  gh api -X PUT repos/ALaustrup/myvybsocial/branches/main/protection \
    -H "Accept: application/vnd.github+json" \
    -f "required_status_checks=null" \
    -F "enforce_admins=true" \
    -f "required_pull_request_reviews[required_approving_review_count]=1" \
    -f "restrictions=null" \
    -F "allow_force_pushes=false" -F "allow_deletions=false"
  ```

### 4.2 Create the fork as a new repo
```bash
# From the parent dir of myvybsocial
git clone --origin upstream https://github.com/ALaustrup/myvybsocial.git vyb-audio
cd vyb-audio
git checkout v1.0.0-myvyb        # start from the frozen, known-good release
git checkout -b main
gh repo create ALaustrup/vyb-audio --private --source=. --remote=origin --push
```
> Cloning with `--origin upstream` keeps a read-only link so you can cherry-pick *bug fixes* from MYVYB later, but VYBZ's `origin` is its own repo. Never `git push upstream`.

### 4.3 Stand up separate infrastructure
| Concern | MYVYB (do not touch) | VYBZ (new) |
|---|---|---|
| Supabase project | `xhgmpodfpcxfshaqspgh` | `xixmneooyufbeftdfpcm` (**already created**, us-west-1, all migrations applied) |
| Vercel project | myvyb | `astramatrix/vyb-audio` (**already created & deployed**) |
| Domain | `myvyb.astramatrix.xyz` | **`vybz.astramatrix.xyz`** — the one and only domain; configure hosting, Supabase Auth Site URL + redirect URLs, email links, SEO/sitemap against it |
| Email sender (Resend) | `noreply@astramatrix.xyz` (MYVYB) | reuse verified `astramatrix.xyz` domain, sender name "VYBZ" |
| Stripe | MYVYB account/products | new product(s) if monetized later |
| LiveKit / OpenAI keys | MYVYB keys | new keys (or scoped) |

- Copy `.env.local` → fill with **new** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, etc. `.env.local` is git-ignored — never commit secrets.
- Apply the **entire** inherited migration set to the new Supabase project first (so you inherit profiles, matchmaking, storage, etc.), then layer the new music migrations (§5–§8) on top.
- Re-run `supabase/configure-email.mjs` against the new project with the VYBZ template (§10.4).

### 4.4 Definition of Done (Phase 0)
The forked app **builds and runs identically to MYVYB** against the new Supabase project (sign up, post, react, match, chat all work) — before any rebrand or music feature. This proves the foundation is intact.

---

## 5. New domain model — music schema (additive migrations)

Create these as new, idempotent, timestamped migrations (e.g. `supabase/migrations/20260705_0001_creator_roles.sql`). **Do not rename or drop inherited tables** in early phases; add alongside.

### 5.1 Controlled vocabularies (taxonomy)
```sql
-- Role taxonomy: the atoms of complementary matching.
create table if not exists public.roles (
  id     text primary key,             -- 'drums', 'piano', 'vocals_lead', 'producer', 'mix_engineer', ...
  label  text not null,                -- 'Drummer', 'Pianist', 'Lead Vocalist', ...
  family text not null,                -- 'instrument' | 'vocal' | 'production' | 'engineering' | 'songwriting' | 'performance' | 'business'
  sort   int  not null default 0
);

create table if not exists public.genres (
  id text primary key, label text not null, sort int not null default 0
);

create table if not exists public.daws (
  id text primary key, label text not null,
  project_ext text                      -- '.als', '.flp', '.logicx', '.ptx', '.rpp', '.song', '.bwproject', '.cpr'
);
```
Seed `roles` from the taxonomy in §7.2, `genres` from §9, and `daws` from §8.3. Taxonomy tables are `select` to `anon, authenticated`; writes are admin-only (RLS).

### 5.2 What a creator OFFERS and SEEKS (the bipartite core)
```sql
-- Roles a creator provides (their skills).
create table if not exists public.creator_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id text not null references public.roles(id),
  skill   smallint not null default 3 check (skill between 1 and 5),
  primary key (user_id, role_id)
);
create index if not exists creator_roles_role_idx on public.creator_roles(role_id);

-- Roles a creator is looking FOR (their needs).
create table if not exists public.creator_seeks (
  user_id  uuid not null references public.profiles(id) on delete cascade,
  role_id  text not null references public.roles(id),
  priority smallint not null default 1 check (priority between 1 and 3),
  primary key (user_id, role_id)
);
create index if not exists creator_seeks_role_idx on public.creator_seeks(role_id);
```
> **Why dedicated tables (not jsonb)?** Complementarity is a *join*: "find users whose `creator_roles.role_id` ∈ my `creator_seeks`." Indexed relational tables make this fast and exact at scale. Genres/DAWs/traits can stay in `profiles.profile` jsonb (reuse the inherited pattern) since they are overlap signals, not the primary join key.

### 5.3 Music facets on the profile (jsonb, reuse inherited pattern)
Store in `profiles.profile` (the existing owner-private blob), so it inherits privacy + the GIN index automatically:
```jsonc
{
  "genres": ["Hip-Hop", "Neo-Soul"],
  "daws": ["ableton", "fl_studio"],
  "influences": "Dilla, Hiatus Kaiyote, D'Angelo",     // free text → embedded for resonance
  "tempoMin": 70, "tempoMax": 100,
  "keys": ["A minor", "F# minor"],
  "remoteOk": true,
  "openToWork": true,
  "lookingFor": ["Collaborator", "Band member", "Co-writer"],  // intent (reuses inherited key)
  "gear": ["MPC One", "Fender Rhodes", "SM7B"],
  "credits": "Mixed 3 EPs; toured with …",
  "_hidden": ["gear"]
}
```

### 5.4 Definition of Done (Phase 1)
Taxonomy seeded; a user can set roles they offer (with skill), roles they seek, genres, DAWs, and influences from the profile editor; data persists and is visible on public profiles (respecting privacy).

### 5.5 VST plugin taxonomy — plugins as a matchmaking & search signal
VST/AU plugins are as central to a producer's identity as their DAW. VYBZ treats the **entire known plugin universe as a controlled vocabulary** users attach to their profiles — feeding search, matchmaking, and (later) deeper integrations.

```sql
-- Plugin taxonomy: seeded from public plugin databases, extended by users.
create table if not exists public.plugins (
  id         text primary key,          -- slug: 'serum', 'omnisphere', 'fabfilter_pro_q3'
  label      text not null,             -- 'Serum', 'Omnisphere', 'FabFilter Pro-Q 3'
  vendor     text,                      -- 'Xfer Records', 'Spectrasonics', 'FabFilter'
  category   text,                      -- 'synth' | 'sampler' | 'eq' | 'compressor' | 'reverb' | 'delay' | 'saturation' | 'mastering' | 'drum_machine' | 'orchestral' | 'fx' | 'utility'
  formats    text[] default '{}',       -- 'VST3','AU','AAX','CLAP'
  verified   boolean not null default false,  -- true = seeded/admin-curated; false = user-submitted pending review
  created_at timestamptz not null default now()
);
create index if not exists plugins_category_idx on public.plugins(category);
create index if not exists plugins_label_trgm on public.plugins using gin (label gin_trgm_ops); -- requires pg_trgm; fuzzy search
```

- **Seeding:** bootstrap from public plugin datasets (KVR Audio's database is the canonical index of known VST/AU/AAX plugins; an initial curated seed of the top ~2,000 plugins covers the overwhelming majority of real-world usage). Users can submit missing plugins (`verified=false`, admin-approved into the canon) so the vocabulary grows with the community without fragmenting into typo-duplicates.
- **Profile facet:** store selections in `profiles.profile` jsonb as `"plugins": ["serum", "fabfilter_pro_q3", ...]` — inherits privacy (`_hidden`) and the GIN index automatically, exactly like genres/DAWs.
- **Matchmaking:** add a `shared_plugins` overlap term to `collab_matches` (§7.3) at **×0.9 per shared plugin, capped** (e.g. at 5) so plugin-hoarders don't distort fit. Shared plugins are a *workflow-compatibility* signal ("we can literally open each other's project files and every channel loads") — surface them in the match "why": *"Both on Ableton · both use Serum + Pro-Q 3."*
- **Search:** `/connect` filters must include plugin facets ("find producers who use Omnisphere"). Trigram index makes typeahead fast.
- **Future sync (push the boundary):** a later phase may add an optional **local plugin scanner** (desktop helper / Capacitor native module) that reads the user's installed VST3/AU directories and offers one-click profile sync of their real plugin arsenal. Design the schema now (this table) so that feature is purely additive.

**Monetization note — gear & plugin affiliate layer (Astra Matrix revenue):** because VYBZ knows what every creator uses and covets, it can *tastefully* link plugins/instruments/gear on profiles and in search results to partner retailers via affiliate programs (Plugin Boutique, Thomann, Sweetwater, Amazon affiliates). Rules: (1) links are contextual and unobtrusive — never banner ads; (2) always disclosed ("partner link"); (3) never influence matchmaking scores. Build as an Edge-Function-resolved link layer (`plugin_id`/`gear` → affiliate URL) so partners can be added/changed server-side with zero client updates. This is a Phase 8+ concern; schema above already supports it.

---

## 6. Content model — the sound-first feed (repurpose everything you inherited)

**Guiding principle:** the inherited platform is *structurally perfect* for VYBZ — keep every page's structure and change its **use-case** to creator connections. Where MYVYB users uploaded videos with quotes, VYBZ users upload **sound clips, audio clips, samples, and stems**. The feed, the reactions, the profiles, the chat, the live layer — all of it stays, re-aimed at audio.

### 6.1 Drops (repurpose `confessions`)
The inherited `confessions` table + `reactions` (Vyb/Fail) is a working feed with voting and matchmaking hooks. **Repurpose it as the "drop" feed** rather than schema-churning early:

- A **"Drop"** showcases a work-in-progress clip, a loop, a "seeking" callout, or a finished idea for feedback. Back it with `confessions` initially; add an `asset_id` FK (nullable) to link a drop to an uploaded asset (§8).
- Keep `reactions` — a **Vyb on a sample-drop is a taste signal** that feeds matchmaking (co-Vyb on samples ⇒ shared sonic taste). This is a *huge* free win: the inherited behavioural matching now means "people who love the same sounds."
- Later (optional, Phase 6+) you may migrate to a purpose-named `drops` table; if so, write a view or rename migration carefully and update `backend.ts`. Not required for launch.

```sql
alter table public.confessions
  add column if not exists asset_id uuid references public.assets(id) on delete set null;
```

### 6.2 The track card (the feed's atomic unit — get this beautiful)
Every drop renders as a **track card** in the feed, replacing the photo/video post. Anatomy (top to bottom):

| Zone | Content |
|---|---|
| **Header** | Creator username + avatar (top-left), their primary role badge (e.g. "Producer"), post age |
| **Stage** (the media area) | The track's **visualizer** (§6.6) fills the card like the photo/video used to; a large **play button dead-center**, waveform scrubber along the bottom edge of the stage |
| **Title row** | Song/clip title (beneath the stage), version tag (`v3`), duration |
| **Tech strip** (subtle, mono font) | BPM · key · bitrate/sample-rate (`320kbps` / `24-bit 48k`) · format badge (`WAV`) — quiet metadata that says "made by someone serious" |
| **Action row** | Vyb/Fail, comment count, **star rating** (§6.3), share-to-collab, save |

**Post customization (creative expression, kept professional):** users personalize their track cards from a *curated* option set — play-button accent color (from the theme palette), a font choice for the title (from a short, professional list), and visualizer style (§6.6). Constraints keep the feed cohesive: no arbitrary colors, no imported fonts, no layout breaking. The same customization philosophy applies platform-wide — **users can express creativity everywhere, inside rails that guarantee everything fits the overall aesthetic.**

**Formats & quality:** accept **all common audio formats** for upload (`wav`, `aiff`, `flac`, `mp3`, `ogg`, `m4a/aac`, plus `midi` and zipped stems/projects) at **any quality/bitrate** — the platform transcodes a normalized streaming preview (§8.4) and preserves the original losslessly for exchange. Never reject a format a DAW can export; never degrade the stored original.

### 6.3 Embedded rating mechanism
On top of the binary Vyb/Fail (kept — it feeds matchmaking), each track carries an **embedded rating** (1–5 stars, one per user, revisable) directly on the card, SoundCloud-style but rating-first rather than play-count-first:

```sql
create table if not exists public.track_ratings (
  asset_id   uuid not null references public.assets(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (asset_id, user_id)
);
alter table public.track_ratings enable row level security;
-- Aggregate (avg + count) cached on assets via trigger, mirroring the inherited tally pattern.
```
Ratings are public and aggregate-only in the UI (avg + count); who-rated-what is never exposed. High-rated tracks in a genre feed matchmaking's taste layer and (later) a "top-rated in Hip-Hop this week" discovery surface — always in service of collab-finding, not vanity charts.

### 6.4 Unlimited uploads
Every profile supports **unlimited samples/clips** for public review and comment. Economically this is only honest with the **hybrid P2P distribution layer (§8.6)** — cloud storage guarantees availability of previews and fresh uploads; the peer swarm absorbs the long tail. Plan quotas as *soft* thresholds that shift assets between tiers (hot = cloud-cached, warm = swarm + cloud cold copy), never as hard caps in the UI.

### 6.5 Platform-wide audio-reactive borders (the signature — PRIORITY)
**This is the feature that captures attention the moment someone arrives.** Whenever ANY audio plays — from the feed, a profile, a project room, anywhere — the **borders of the entire viewport react in real time** to the playback.

**Default behavior ("Neon Pulse"):** on each audio event (default trigger: **bass / low-end energy**, roughly the 20–150 Hz band), a **subtle neon pulse wave is born at the center of every borderline of the current page** and calmly radiates outward along the border in both directions — a colorful, vibration-style wave of radiance flowing around the full perimeter. Calm, elegant, hypnotic; **never** strobing or distracting.

**Architecture (build it right the first time):**
- A single global `AudioBus` singleton: every player on the platform routes through one shared `AudioContext` → `AnalyserNode` chain. No component ever creates its own context; they register with the bus. (This also future-proofs §6.6 visualizers and any later audio tooling.)
- A `BorderFX` layer mounted once at the app shell (above routing, below modals): a full-viewport, pointer-events-none `<canvas>` (or four edge canvases) rendering the perimeter wave at 60fps from the analyser's frequency data. GPU-friendly: one rAF loop, no React re-renders (refs only), degrade gracefully on weak devices (drop to 30fps, simplify glow).
- **Frequency mapping:** default drives the wave from low-end energy (bass hits birth pulses; sub-bass sustains a gentle baseline glow). The mapping is a pure function `(fftData) → waveParams` so alternate mappings are pluggable.
- **User settings (Settings → Reactivity):** trigger band (bass / mids / highs / full spectrum), intensity (off / subtle / standard / bold), palette (theme-derived by default), wave speed. **Respect `prefers-reduced-motion`** — auto-off with a static accent border instead.
- Performance budget: the effect must cost <3ms/frame on a mid-range phone; feature-detect and tier down before ever degrading scrolling.

### 6.6 Track visualizers (unique media behind every post)
The visual "stage" of each track card (§6.2) is a **generative, audio-reactive visualizer** — not a static image. Two rules make this a differentiator:

1. **Style choice:** creators pick from a growing library of visualizer styles (launch set: *Waveform Bloom* — blooming radial waveform; *Spectrum Terrain* — scrolling frequency landscape; *Particle Drift* — bass-driven particle field; *Neon Grid* — retro grid that warps to the beat; *Ink Flow* — fluid simulation stirred by mids).
2. **Guaranteed uniqueness:** every rendered visualizer is **seeded** from `hash(creator_id + asset_id)` — palette phase, geometry offsets, motion character all derive from the seed. Two creators using the same style still get *visibly distinct* results: **no two tracks on VYBZ ever look the same.** (The inherited `confessions.seed` column pattern shows the way.)

Implementation: visualizer = pure function `(seed, styleId, analyserData, t) → frame`, rendered to canvas/WebGL in the card, fed by the same `AudioBus`. When a card is off-screen or audio is paused, render a beautiful static frame from the seed (zero idle cost). Visualizer choice + accent customization are stored per-drop (jsonb on the drop row), like the inherited `font_style`/`text_fx` pattern.

---

## 7. THE MATCHMAKING ENGINE (the core of VYBZ)

Every possible creator-to-creator connection must match with precision. Achieve this with a **generic role-complementarity model** (so you never hardcode pairs) layered on the inherited multi-signal engine.

### 7.1 The complementarity principle
For caller **me** and candidate **u**:
- **Forward complement** = `|me.seeks ∩ u.offers|` — *they have what I want*.
- **Backward complement** = `|u.seeks ∩ me.offers|` — *I have what they want*.
- **Mutual bonus** applies when *both* > 0 — a two-way fit (the gold standard). This makes "Drummer seeking Pianist" ⇄ "Pianist seeking Drummer" the top result for each other, automatically. The same generic logic yields Vocalist⇄Band, Guitarist⇄Beatmaker, Band⇄Guitarist, Songwriter⇄Topliner, Artist⇄Mix Engineer, and **every other pairing**, in both directions, with no special cases.

### 7.2 Role taxonomy (seed `roles`) — enumerate broadly
- **instrument:** drums, percussion, piano, keys/synth, guitar_electric, guitar_acoustic, bass, violin, cello, saxophone, trumpet, flute, strings_section, brass_section, turntables/dj, other_instrument
- **vocal:** vocals_lead, vocals_backing, rapper, topliner, songwriter_lyricist, spoken_word
- **production:** producer, beatmaker, sound_designer, composer, arranger, remixer, sampler
- **engineering:** mix_engineer, master_engineer, recording_engineer, vocal_tuning_editor
- **performance:** band (ensemble seeking members / member seeking band), live_performer, session_musician
- **business:** manager, a_and_r, sync_licensing, studio_owner
Each role is both **offerable** and **seekable**, which is what makes all directions work.

### 7.3 The blended score (extend `user_matches` → `collab_matches`)
Add a new definer function (leave `user_matches` intact for any generic social use). Blend, per candidate:

| Signal | Source | Suggested weight |
|---|---|---|
| Forward complement (me seeks → they offer) | `creator_roles`/`creator_seeks` | ×3.0 per role |
| Backward complement (they seek → I offer) | same | ×3.0 per role |
| **Mutual complement bonus** | both directions present | +4.0 flat |
| Skill-tier proximity on complemented roles | `creator_roles.skill` | up to ×1.0 (closer = better) |
| Genre overlap | `profile->'genres'` | ×1.4 per genre |
| DAW/format compatibility (can they exchange files) | `profile->'daws'` | ×1.2 per shared DAW |
| **VST plugin overlap** (workflow compatibility, §5.5) | `profile->'plugins'` | ×0.9 per shared plugin (cap 5) |
| Tempo/key affinity | `profile->'tempo*'/'keys'` | ×0.6 |
| Sample-taste (co-Vyb on drops) | `reactions` | ×1.0 / ×0.8 co-fail |
| Semantic resonance (influences/bio) | `profile_embeddings` | ×3.0 (cosine) |
| Locality / remote-compatible | `profiles.location`, `profile->'remoteOk'` | ×0.8 |
| Language overlap | `profile->'languages'` | ×0.5 |
| "Open to work" boost | `profile->'openToWork'` | +1.0 |

Normalize to a 0..1 `fit`, and **return the "why"** (which roles complement, shared genres, shared DAWs, resonance) so the UI can explain every match — e.g. *"You want a Pianist · they play Piano (skill 5) · you both want a Drummer · 3 shared genres · both on Ableton."*

```sql
-- collab_matches: complementary-role matching for creators.
-- SECURITY DEFINER so it can read private facets to improve YOUR matches,
-- but only ever emits aggregates + role labels, never raw private values.
create or replace function public.collab_matches(p_limit int default 20)
returns table(
  user_id uuid, username text, alias text,
  offers_you_seek text[],      -- role labels they offer that you seek
  seeks_you_offer text[],      -- role labels they seek that you offer
  mutual boolean,
  shared_genres text[], shared_daws text[],
  resonance numeric,           -- 0..1 semantic
  fit numeric                  -- 0..1 blended
)
language sql security definer set search_path = public stable as $fn$
  with me as (
    select id,
           coalesce(profile->'genres','[]'::jsonb)   as genres,
           coalesce(profile->'daws','[]'::jsonb)     as daws
    from public.profiles where id = auth.uid()
  ),
  my_offers as (select role_id from public.creator_roles where user_id = auth.uid()),
  my_seeks  as (select role_id from public.creator_seeks where user_id = auth.uid()),
  me_vec    as (select embedding from public.profile_embeddings where user_id = auth.uid()),
  -- Candidates: anyone who offers something I seek, OR seeks something I offer,
  -- OR is semantically near me (so thin profiles still match).
  cand as (
    select cr.user_id from public.creator_roles cr join my_seeks s on s.role_id = cr.role_id
    union
    select cs.user_id from public.creator_seeks cs join my_offers o on o.role_id = cs.role_id
    union
    select e.user_id from public.profile_embeddings e
      where exists (select 1 from me_vec) and e.user_id <> auth.uid()
      order by e.embedding <=> (select embedding from me_vec) limit 200
  ),
  scored as (
    select
      c.user_id,
      -- forward: they offer what I seek
      array(select r.label from public.creator_roles cr
              join my_seeks s on s.role_id = cr.role_id
              join public.roles r on r.id = cr.role_id
             where cr.user_id = c.user_id)                      as offers_you_seek,
      -- backward: they seek what I offer
      array(select r.label from public.creator_seeks cs
              join my_offers o on o.role_id = cs.role_id
              join public.roles r on r.id = cs.role_id
             where cs.user_id = c.user_id)                      as seeks_you_offer,
      public.jsonb_overlap_names(p.profile->'genres', me.genres) as shared_genres,
      public.jsonb_overlap_names(p.profile->'daws',   me.daws)   as shared_daws,
      (case when exists (select 1 from me_vec) and pe.embedding is not null
            then greatest(0, 1 - (pe.embedding <=> (select embedding from me_vec)))
            else 0 end)::numeric                                as sim,
      coalesce((p.profile->>'openToWork')::boolean, false)       as open_to_work
    from (select distinct user_id from cand) c
    join public.profiles p on p.id = c.user_id
    cross join me
    left join public.profile_embeddings pe on pe.user_id = c.user_id
    where c.user_id <> auth.uid()
      and coalesce(p.banned,false) = false
  ),
  blended as (
    select s.*,
      (coalesce(array_length(s.offers_you_seek,1),0) * 3.0
       + coalesce(array_length(s.seeks_you_offer,1),0) * 3.0
       + case when coalesce(array_length(s.offers_you_seek,1),0) > 0
               and coalesce(array_length(s.seeks_you_offer,1),0) > 0 then 4.0 else 0 end
       + coalesce(array_length(s.shared_genres,1),0) * 1.4
       + coalesce(array_length(s.shared_daws,1),0)   * 1.2
       + s.sim * 3.0
       + case when s.open_to_work then 1.0 else 0 end) as raw
    from scored s
  )
  select
    b.user_id, pr.username, pr.alias,
    b.offers_you_seek, b.seeks_you_offer,
    (coalesce(array_length(b.offers_you_seek,1),0) > 0
      and coalesce(array_length(b.seeks_you_offer,1),0) > 0) as mutual,
    b.shared_genres, b.shared_daws,
    round(b.sim, 3) as resonance,
    round(least(1.0, b.raw / 16.0), 3) as fit
  from blended b
  join public.profiles pr on pr.id = b.user_id
  where (coalesce(array_length(b.offers_you_seek,1),0) > 0
      or coalesce(array_length(b.seeks_you_offer,1),0) > 0
      or b.sim >= 0.6)
  order by b.raw desc
  limit greatest(1, least(100, p_limit));
$fn$;
grant execute on function public.collab_matches(int) to authenticated;
```
> Tune weights against real data; the shape is what matters. Mirror the inherited discipline: definer, `search_path = public`, aggregate-only output, banned excluded.

### 7.4 Opportunity-based matching (explicit "seeking" posts)
Beyond profile↔profile, support **posted opportunities** so "Band seeking guitarist" is a first-class object matched to guitarists:
```sql
create table if not exists public.collab_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  role_needed text not null references public.roles(id),   -- e.g. 'guitar_electric'
  title text not null, body text,
  genres text[] default '{}', daws text[] default '{}',
  remote_ok boolean default true, location text,
  commitment text,                 -- 'one-off' | 'ongoing' | 'session' | 'band-member'
  status text not null default 'open' check (status in ('open','filled','closed')),
  created_at timestamptz not null default now()
);
alter table public.collab_posts enable row level security;
create policy "collab_posts read" on public.collab_posts for select using (true);
create policy "collab_posts write" on public.collab_posts for all
  using (author_id = auth.uid()) with check (author_id = auth.uid());

create table if not exists public.collab_applications (
  post_id uuid references public.collab_posts(id) on delete cascade,
  applicant_id uuid references public.profiles(id) on delete cascade,
  message text, asset_id uuid references public.assets(id),   -- attach an audition clip/stem
  created_at timestamptz not null default now(),
  primary key (post_id, applicant_id)
);
alter table public.collab_applications enable row level security;
```
Provide `my_opportunities()` (definer) that returns open `collab_posts` whose `role_needed` ∈ my offered roles, ranked by genre/DAW/locality/resonance — so a guitarist opens the app and sees every band that needs a guitarist, best-fit first. And its inverse for authors: rank applicants/candidates for a post.

### 7.5 Definition of Done (Phase 2)
`collab_matches` and `my_opportunities` return precise, explained results; the `/connect` page is rebuilt around "Find your ___" with mutual-match highlighting; the swipe deck (`/spark` → repurpose) swipes on complementary creators. Cross-direction pairs (drummer⇄pianist etc.) verifiably surface each other at the top.

---

## 8. Audio & project-file exchange

### 8.1 Assets schema
```sql
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in
    ('sample','loop','oneshot','stem','acapella','midi','preset','project','track')),
  title text not null, description text,
  url text not null,                 -- storage path
  waveform jsonb,                    -- precomputed peak array for instant preview
  bpm numeric, musical_key text,
  genres text[] default '{}',
  daw text references public.daws(id),   -- for 'project'/'preset'
  format text,                        -- 'wav','mp3','flac','zip','als', ...
  duration_sec numeric, size_bytes bigint,
  downloadable boolean not null default true,   -- exchange vs preview-only
  license text default 'collab-only',           -- 'collab-only' | 'credit-required' | 'free'
  nsfw boolean default false,
  created_at timestamptz not null default now()
);
alter table public.assets enable row level security;

create table if not exists public.asset_downloads (
  asset_id uuid references public.assets(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (asset_id, user_id)
);
create table if not exists public.asset_collections (      -- packs / folders
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  title text not null, created_at timestamptz default now()
);
create table if not exists public.asset_collection_items (
  collection_id uuid references public.asset_collections(id) on delete cascade,
  asset_id uuid references public.assets(id) on delete cascade,
  primary key (collection_id, asset_id)
);
```
- **Reactions on assets:** reuse `reactions` (or an `asset_reactions` mirror) so Vyb/Fail on samples feeds taste-matching.
- **RLS:** previews (samples/loops/stems) readable by all; **project files** readable only by the owner and explicitly-granted collaborators (see §8.5). Downloads gated through a definer RPC that records `asset_downloads`.

### 8.2 Storage buckets
Add via migration (mirror inherited bucket setup):
- `audio-previews` (public) — short/normalized preview renders (mp3) + waveforms.
- `audio-assets` (private) — full-quality samples/stems; download via signed URL from a definer RPC after permission check.
- `project-files` (private) — DAW projects/zips; only owner + granted collaborators.
Set sane `file_size_limit`s (e.g. previews 10 MB, assets 100 MB, projects 500 MB — tune to plan).

### 8.3 DAW support (seed `daws`)
Ableton Live (`.als`), FL Studio (`.flp`), Logic Pro (`.logicx`), Pro Tools (`.ptx`), Reaper (`.rpp`), Studio One (`.song`), Bitwig (`.bwproject`), Cubase (`.cpr`), Reason (`.reason`), GarageBand (`.band`). Projects are typically uploaded as `.zip` bundling the project + samples; store `daw` + `format='zip'`.

### 8.4 Waveform & preview pipeline
- On upload, decode client-side with the **Web Audio API** (`decodeAudioData`) and compute a downsampled peaks array (e.g. 800 buckets) → store in `assets.waveform`. Render a lightweight canvas waveform + HTML5 `<audio>` for scrub/preview. This reuses the inherited media-guard (no right-click/save) philosophy.
- Optional (later): an Edge Function/worker to transcode a normalized mp3 preview and (future) compute audio embeddings for **sonic similarity** search ("find samples that sound like this").

### 8.5 Collaboration handoff (project sharing + versions)
```sql
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  title text not null, description text,
  bpm numeric, musical_key text, genres text[] default '{}',
  daw text references public.daws(id),
  status text default 'open' check (status in ('open','in-progress','done','archived')),
  created_at timestamptz default now()
);
create table if not exists public.project_collaborators (
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role_id text references public.roles(id),
  can_upload boolean default true,
  primary key (project_id, user_id)
);
create table if not exists public.project_versions (       -- versioned handoffs
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  uploader_id uuid references public.profiles(id),
  asset_id uuid references public.assets(id),   -- the project-file bundle
  note text, version int not null,
  created_at timestamptz default now()
);
create table if not exists public.split_sheets (          -- credits & ownership %
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role_id text references public.roles(id),
  split numeric check (split >= 0 and split <= 100),
  agreed boolean default false,
  primary key (project_id, user_id)
);
```
RLS: only project members can read a project, its versions, and its split sheet. This is the "exchange project files for DAWs" core: a private room where collaborators hand off versioned bundles and agree splits/credits.

### 8.6 Hybrid P2P distribution layer ("the swarm") — unlimited by design
**Goal:** unlimited uploads (§6.4) without unlimited storage bills, and a genuinely interconnected network where the community itself carries the community's sound. Think **torrent mechanics, but smaller, invisible, and locked down** — peers never get raw file access on the front end.

**Architecture (WebRTC swarm over encrypted chunks):**
1. **Chunking:** on upload, the original file is split into fixed-size chunks (256 KB–1 MB). Each chunk is **encrypted (AES-GCM, per-asset content key)** and content-addressed by the hash of its *ciphertext*. Peers therefore store and forward **opaque encrypted blobs** — a peer hosting chunks can never listen to, reassemble, or even identify the audio they carry. This is the security property that makes P2P acceptable here.
2. **Manifest:** an asset's manifest (chunk hashes, order, key envelope) lives in Postgres. The **content key is delivered only via a `SECURITY DEFINER` RPC / Edge Function after a permission check** (same gate as §8.1 downloads) — so swarm distribution and access control are fully decoupled. Possessing every chunk without the key yields nothing.
3. **Transport:** WebRTC DataChannels between browsers (the proven WebTorrent path — `bittorrent-protocol` over `RTCDataChannel`); Supabase Realtime doubles as the signaling/tracker layer (peer announce/discover per asset). Native (Capacitor) peers can additionally seed in the background.
4. **Cloud anchor (hybrid, always):** Supabase Storage keeps (a) every preview/stream render — **playback never depends on peers** — and (b) a cold copy of every original, so a track with zero seeders is still always retrievable. The swarm accelerates and absorbs cost for the hot path of *full-quality exchange*; it is never a single point of failure.
5. **Incentives:** seeding is rewarded through the inherited credits system (seed-time/bytes-served → V¢-style credits), making generosity visible on profiles ("Node" badge). Off by default on metered connections; per-user toggle + bandwidth caps in Settings.
6. **Phasing:** ship cloud-only first (Phase 3), introduce the swarm as a transparent accelerator (Phase 6+) behind a feature flag. The chunk/manifest schema is designed in from day one so no re-upload migration is ever needed.

> **Non-negotiable:** peers exchange *encrypted chunks* only; keys flow only through the permission-checked server path; the browser UI never exposes chunk/file internals. "P2P" must never mean "public."

### 8.7 Audio safeguarding — anti-theft & anti-piracy (innovate here)
Theft is *the* reason creators hesitate to share raw materials. VYBZ's defense is **layered** — no single silver bullet, but a stack that makes misuse detectable, attributable, and legally actionable. This must feel like a feature creators brag about, not a wall.

**Layer 1 — Transport & access (never raw):**
- Originals live in private buckets (§8.2) / encrypted swarm chunks (§8.6); **no public URL to an original ever exists.** Full-quality access flows only through short-lived signed URLs minted by a definer RPC after a permission + license check, with every grant recorded in `asset_downloads` (who, what, when).
- In-feed playback streams the **preview render only** (normalized, capped quality) — ripping the stream never yields the exchange-grade file.

**Layer 2 — Forensic watermarking (attribution):**
- Every full-quality download is **individually watermarked per recipient**: an inaudible payload (recipient id + asset id + timestamp) embedded via spread-spectrum/echo-modulation in the audio itself, robust to transcoding, trimming, and pitch/tempo edits. Implemented in an Edge Function/worker at download time (watermark-on-delivery, so each copy is unique).
- If a sample leaks to a marketplace or another platform, the watermark answers **"which recipient leaked it"** — transforming piracy from anonymous to attributable. This changes behavior more than any lock.

**Layer 3 — Fingerprint registry (proof of provenance):**
- On upload, compute a **perceptual audio fingerprint** (chromaprint-class) + cryptographic hash, stored with a trusted timestamp: a tamper-evident **"first seen on VYBZ"** provenance record creators can cite in disputes. Also attach **C2PA-style provenance manifests** to delivered files where format allows.
- The same registry powers **internal originality checks** (flag a re-upload of someone else's protected sample before it publishes) and can later scan external sources.

**Layer 4 — License + legal rails:**
- Every asset carries its license (`collab-only` / `credit-required` / `free`, §8.1); every download grant records the license accepted at that moment (an auditable license chain).
- DMCA/takedown tooling (§13) with the fingerprint registry as evidence; repeat-infringer policy enforced via the inherited moderation/admin stack.

**Honesty rule:** market this as **protection and provenance, not unbreakable DRM** (analog re-recording always exists). VYBZ's promise: *your work is encrypted in transit and at rest, every copy is traceable to its recipient, and your authorship is provably timestamped.* That is more than any mainstream platform offers creators today — and yes, if the watermark+provenance registry works at scale, it's a model the wider industry can adopt. Aim for that.

### 8.8 Definition of Done (Phases 3–4)
Upload a sample → waveform preview plays in-feed; Vyb + star rating feed taste-matching; download recorded, watermarked, and license-logged. Create a project, add a collaborator, upload a versioned project bundle only they can access, and fill a split sheet. Fingerprint + provenance row exists for every published asset.

---

## 9. Profile data-points rewrite (`src/lib/profileFields.ts`)

Keep the file's **shape** (exports, helpers) and replace **contents** for music. Illustrative catalog:
```ts
export const GENRES: string[] = [
  "Hip-Hop","Trap","R&B","Neo-Soul","Pop","Afrobeats","Amapiano","House","Techno",
  "Drum & Bass","Dubstep","EDM","Lo-Fi","Jazz","Funk","Soul","Rock","Metal","Punk",
  "Indie","Folk","Country","Reggae","Dancehall","Latin","Reggaeton","Classical",
  "Ambient","Experimental","Gospel","Blues","World",
];
export const DAWS = [
  { id: "ableton", label: "Ableton Live" }, { id: "fl_studio", label: "FL Studio" },
  { id: "logic", label: "Logic Pro" }, { id: "pro_tools", label: "Pro Tools" },
  { id: "reaper", label: "Reaper" }, { id: "studio_one", label: "Studio One" },
  { id: "bitwig", label: "Bitwig" }, { id: "cubase", label: "Cubase" },
  { id: "reason", label: "Reason" }, { id: "garageband", label: "GarageBand" },
];
// CHOICE_FIELDS: lookingFor (Collaborator, Band member, Session work, Co-writer,
//   Feedback, Sample trade, Ghost production, Remix, Sync), languages (keep).
// PROMPTS (music-flavored): "The record that changed me…", "My signature sound is…",
//   "I'm looking to level up my…", "Dream collaborator…".
// TRAITS: workflow (Fast/Meticulous), session style (In-person/Remote/Both),
//   role-in-room (Leader/Supporter/Flexible).
```
Roles offered/sought get their **own editor UI** backed by `creator_roles`/`creator_seeks` (not jsonb). Update `completeness()` to weight roles, genres, DAWs, influences, **and plugins (§5.5)**.

### 9.1 Profiles — maximum creative expression, professional edge
A VYBZ profile is a creator's storefront-of-self, and it must nail a dual mandate:
- **Maximum creative expression:** accent palettes, a featured track with its visualizer as the profile hero, pinned drops, customized track cards (§6.2), taste badges (genres/plugins/DAWs rendered beautifully), the audio-reactive treatment on their own page.
- **Professional edge, always:** every expressive option comes from a curated set that cannot produce a childish or broken result. If a customization option could make a profile look unserious to an A&R or a seasoned engineer, it doesn't ship. Think "artist EPK energy," not "MySpace glitter."
- **Matchmaking first (the tiebreaker rule):** whenever profile design choices compete, the one that **feeds or showcases matchmaking wins** — roles offered/sought, fit-relevant facets, and the "why we match" surfaces always get the prime real estate. A gorgeous profile that doesn't drive connections is a failure; every profile is an input to the algorithm first, a canvas second.

---

## 9.5 Extensibility — add-ons & custom production tools (plan for it now)
VYBZ will grow **first-party add-ons and production integrations** over time (e.g., a stem-splitter, a key/BPM analyzer bot, a mastering-preview tool, DAW companion plugins, the §5.5 plugin scanner). Don't build them yet — but architect so they bolt on cleanly:

- **Tool registry pattern:** a `tools` table (id, label, kind, entry URL/function, min plan, active) + per-user enablement, so new tools appear in a "Tools" surface without client releases.
- **Contract:** every tool consumes/produces `assets` (§8.1) through the same permission-checked RPCs as the rest of the platform — tools get no privileged data paths.
- **Isolation:** heavy processing lives in Edge Functions/workers, never the client bundle; UI panels lazy-load (the inherited Three.js/LiveKit pattern).
- **Third-party later:** if an external developer surface ever opens, it rides the same registry + OAuth scopes; nothing about today's schema should preclude that.

---

## 9.6 Categorized collab chat — production-typed rooms (future phase)

The inherited chat hub (Rooms + Circles, §3.6) is re-aimed at **gear- and craft-centric collaboration talk**, organized by the same controlled vocabularies that power matchmaking (§5, §7.2). This turns every taxonomy entry into a living conversation space — and every conversation into fresh matchmaking signal.

**Concept (conceptual examples, to be elaborated later):**
- A **category taskbar** across the top of the chat page selects a *production domain*. Launch categories:
  - **DAWs** → rooms per DAW: Ableton Live, FL Studio, Reason, Cubase, Logic, Pro Tools, Reaper, Studio One, Bitwig, …
  - **Plug-Ins** → rooms per vendor/plugin: Xfer (Serum), Native Instruments, Tone2, FabFilter, Spectrasonics, …
  - **Instruments** → rooms per instrument: Acoustic Guitar, Bass Guitar, Drums, Electronic Drums, Flute, Piano, Synth, Turntables, …
- Selecting a category **swaps the room listing** to show the rooms defined for items in that category. Selecting an item opens its room.
- Later categories can extend to **Genres**, **Roles/Craft** (Mixing, Mastering, Songwriting), and **Regions/Scenes** — anything already modeled as a taxonomy.

**Architecture (additive, reuses inherited rooms):**
- Rooms remain the inherited `rooms`/`room_messages` tables. Add a nullable **`category`** (`'daw' | 'plugin' | 'instrument' | …`) and **`taxonomy_id`** (FK-by-convention to `daws.id` / `plugins.id` / `roles.id`) so a room binds to a taxonomy entry. No new chat engine — only categorization metadata + a grouped listing UI.
- **Auto-provision** a canonical room per seeded taxonomy entry (idempotent seed migration), so the DAWs/Plug-Ins/Instruments tabs are populated from day one and stay in sync as the vocabulary grows.
- **Matchmaking feedback loop:** presence/activity in a taxonomy room is a soft affinity signal — *"active in the Ableton + Serum rooms"* quietly reinforces DAW/plugin overlap in `collab_matches` (§7.3). Keep it a gentle signal, never a hard filter.
- The category taskbar reuses the existing per-page accent theming and the glass/industrial aesthetic; on mobile the taskbar scrolls horizontally, listings stack.

**Copy discipline:** category and room labels are the taxonomy labels themselves — minimal, no ornamental copy. This is a **future phase** (see §12); Phase 1 only needs to seed the taxonomies that will later back these rooms.

---

## 10. Rebrand map (MYVYB → VYBZ)

> ~500 brand references exist. Work **file-family by file-family**; verify with `npm run build` after each. **Do NOT blindly rename DB tables or `localStorage` keys** — those cause data loss / churn. Follow the notes.

### 10.1 Brand assets & components
- `src/components/Brand.tsx` — text fallbacks `"MYVYB"` → `"VYBZ"`; drop new artwork in `public/brand/` (`icon.svg`, `wordmark.svg`).
- `src/components/Copyright.tsx` — `"MYVYB"` wordmark stays a brand token → `"VYBZ"`; keep `© <year> Astra Matrix, Inc. All rights reserved.` (owner is still Astra Matrix, Inc. — see §13).
- `public/brand/`, `public/icons/*`, `favicon.svg`, `favicon-64.png`, `manifest.*.webmanifest` — replace icons and names.

### 10.2 Metadata / SEO
- `index.html` — `<title>`, meta description, `og:*`, `twitter:*`, `canonical`, JSON-LD `logo`/`name`, subtitle. The tagline is exactly **"VYBZ: Find Yours."**
- `public/robots.txt`, `public/sitemap.xml` — domain is **`vybz.astramatrix.xyz`**.
- `package.json` — `name` (`vyb-audio` stays as the technical package name), `description` mentions VYBZ.

### 10.3 Copy & terminology — MINIMAL, always
- **Copy discipline:** all product copy is minimal and geared to one idea — *finding collabs and sharing samples with the creators seeking them*. "VYBZ: Find Yours." is the model sentence: short, confident, zero fluff. Audit every string against it; cut anything ornamental.
- User-facing strings in `src/store/AppStore.tsx`, `src/pages/*`, `src/components/*` (toasts like `"Welcome to MYVYB ✨"`, tutorial, onboarding). Reframe "confessions/posts" → **"drops"**, "vibe" language → creator/collab language.
- Legal copy: `src/data/legal.ts` (28 refs) — update service name, add audio/UGC and collaboration/splits clauses (§13).

### 10.3a Visual identity — keep the MYVYB energy
The MYVYB look **works**: enough creative energy to invoke and intrigue, while staying easy to comprehend. **Keep it essentially the same** — the glass/industrial aesthetic, per-page accent theming, dark canvas, neon accents all carry over. The single refinement: **make the borders a bit more professional** — cleaner corner radii, more consistent border weights/contrast, tighter edge treatments. (This dovetails with §6.5: those same borders become the audio-reactive canvas, so they must look immaculate at rest.) Do not redesign; refine.

### 10.4 Email
- `supabase/email-templates/confirm.html` — wordmark `MYVYB` → `VYBZ`, keep the animated badge pattern, logo → new hosted icon URL, copyright. Re-apply via `supabase/configure-email.mjs` against the **new** project.

### 10.5 Careful — do NOT auto-rename
- **DB tables** (`confessions`, `reactions`, etc.): keep names in early phases (renaming breaks every query + RLS). Repurpose semantically; rename later only via deliberate migration + `backend.ts` update.
- **`localStorage` keys** prefixed `veiled.` / `myvyb.`: keep or write a one-time migration that copies old→new on boot. A blind rename silently logs users out / drops local prefs.
- **Owner admin email** `andrewiguess@gmail.com` in `20260624_0001_...sql` (`grant_admin_for_owner`): keep, or change to the intended VYBZ owner in a **new** migration — don't edit the historical file on the live DB without care.
- `--origin upstream` cherry-picks: don't drag MYVYB-specific copy back in.

---

## 11. Development rules (obey on every change)

**Architecture & security (non-negotiable):**
1. **Secrets never touch the client.** OpenAI, Resend, Stripe, LiveKit, service-role keys live only in **Edge Functions** / server env. The client uses the anon key + RLS only.
2. **RLS on by default.** Every new table `enable row level security`. Sensitive tables get **no direct client policies** — access flows through `SECURITY DEFINER` RPCs that enforce ownership/permission and emit only what's allowed (mirror `user_matches`, `dating_deck`, `companion_recall`).
3. Definer functions **always** `set search_path = public` (search-path hardening is already a migration; keep it).
4. **Idempotent, timestamped migrations** (`create ... if not exists`, `create or replace`). Never edit an already-applied historical migration to change live behavior — add a new one.
5. **Validate & sanitize** all user input (SQL is parameterized via Supabase; check file type/size/mime on upload; guard XSS in any rendered HTML). Treat uploaded audio/project files as untrusted.
6. Ownership checks on every mutation (`auth.uid()`), banned-user exclusion, age-layer separation where inherited.

**Code quality:**
7. TypeScript strict; `npm run build` (runs `tsc --noEmit`) must pass with **zero errors** before commit. Run `ReadLints`/lint after substantive edits.
8. **Modular, small units.** No monolithic files/components/functions. Reuse the `@/` alias and existing utilities.
9. **Additive & non-breaking.** Lazy-load heavy modules (Three.js/LiveKit pattern). Feature-flag risky work.
10. Comments only for non-obvious intent/trade-offs — never narrate obvious code.
11. Latest stable deps (Node LTS ≥20). Flag any deprecated library and prefer the maintained alternative.
12. **Mobile-first + PWA + Capacitor parity.** Keep per-page accent theming and the glass/industrial aesthetic. Accessibility: labels, focus states, `prefers-reduced-motion`.

**Process:**
13. Prepare changes PR-style: brief summary → file path → change. Commit only when asked; never commit secrets (`.env*`).
14. Confirm before destructive/irreversible actions (drops, deletes, force-push, table renames).
15. Deployment prefers containerization for any self-hosted piece; the primary server `51.210.209.112` is treated as production (SSH key auth; check `/var/log/nginx/error.log`, `journalctl -u <svc>` when debugging).

---

## 12. Phased roadmap (execute in order)

| Phase | Deliverable | DoD |
|---|---|---|
| **0. Fork & infra** | New repo from `v1.0.0-myvyb`, new Supabase/Vercel, **domain `vybz.astramatrix.xyz`**, all inherited migrations applied, env wired | App runs identically under new infra (§4.4) |
| **1. Creator identity** | `roles`/`genres`/`daws`/**`plugins`** taxonomy, `creator_roles`/`creator_seeks`, music jsonb facets, profile editor rewrite (§5, §9), profile expression rails (§9.1) | User sets offers/seeks/genres/DAWs/**plugins**/influences; persists + shows (§5.4) |
| **2. Matchmaking** | `collab_matches` (incl. plugin overlap) + `my_opportunities` + rebuilt `/connect` with plugin/genre filters + collab swipe (§7) | Complementary pairs surface each other precisely, with "why" (§7.5) |
| **3. Sound-first feed** | `assets` + buckets + track cards (§6.2) + star ratings (§6.3) + waveform preview + all-format upload + Vyb-taste feed + download gating (§8.1–8.4) | Upload → track card plays in-feed → rating + download recorded (§8.8) |
| **4. Signature reactivity** | Global `AudioBus` + **audio-reactive border FX** (§6.5) + **track visualizer library with seeded uniqueness** (§6.6) + reactivity settings | Bass-driven neon pulse live on every page during playback; every track visually unique; reduced-motion respected |
| **5. Projects & collab rooms** | `projects`/`collaborators`/`versions`/`split_sheets` + private handoff (§8.5) | Versioned private project handoff + split sheet (§8.8) |
| **6. Opportunities board** | `collab_posts`/`collab_applications` UI + matching (§7.4) | "Band seeking guitarist" reaches guitarists; applications with audition clips |
| **7. Protection layer** | Forensic watermark-on-delivery, fingerprint/provenance registry, license chain (§8.7) | Every delivered file watermarked + provenance recorded (§8.8) |
| **8. The swarm (P2P)** | Encrypted-chunk WebRTC distribution behind a flag, seeding credits (§8.6) | Full-quality exchange accelerates via peers; cloud fallback seamless; keys server-gated |
| **9. Tracks & credits** | song/track metadata, discography, verified credits | Users list works + credited collaborators |
| **10. Live & rooms** | Reuse LiveKit for listening/rehearsal/feedback sessions; optional XR listening room | Live collab session works |
| **10.5 Categorized collab chat** | Production-typed chat rooms (§9.6): category taskbar (DAWs / Plug-Ins / Instruments), taxonomy-bound rooms, auto-provisioned from seeds, presence feeds matchmaking | Selecting a category swaps room listings; each taxonomy item has a room; activity nudges DAW/plugin overlap |
| **11. Rebrand polish & launch** | Full §10 rebrand ("VYBZ: Find Yours."), SEO on `vybz.astramatrix.xyz`, legal, email, mobile QA, border refinement (§10.3a) | Clean brand, green Lighthouse, legal complete |
| **12+. Add-ons & commerce** | Tools registry (§9.5), plugin scanner sync (§5.5), affiliate gear/plugin links (§5.5 note) | Tools bolt on with zero client releases; affiliate links disclosed + non-intrusive |

---

## 13. Legal & copyright

- Product/service name in all copy → **VYBZ**. Tagline: **"VYBZ: Find Yours."** Corporate owner remains **Astra Matrix, Inc.**: `© <current year> Astra Matrix, Inc. All rights reserved.`
- **Copy stays minimal even here:** legal pages are complete and rigorous, but every user-facing summary of them follows the brand voice — VYBZ exists for finding collabs and sharing samples with the creators seeking them; say that plainly and stop.
- Update `src/data/legal.ts` (Terms, Privacy, Community, and any DMCA/UGC pages) to reflect: user-uploaded audio and **project files**, an **exchange/collaboration** model (not sales), **license tiers** per asset (`collab-only` / `credit-required` / `free`), **split-sheet/credit** agreements, the **forensic watermarking + provenance registry** (§8.7 — users must be informed downloads are watermarked and uploads fingerprinted), P2P seeding disclosure (§8.6), affiliate-link disclosure (§5.5), and a **DMCA/takedown** process for infringing uploads. Add an audio-content acceptable-use clause.
- Keep the frozen MYVYB legal docs untouched in that repo; VYBZ maintains its own.

---

## 14. Quick-start checklist for the new session

1. Confirm you're in the `vyb-audio` repo (brand: **VYBZ**), forked from `v1.0.0-myvyb`, with its **own** Supabase project (`xixmneooyufbeftdfpcm`) + env. (Never the MYVYB project.)
2. Phase 0 infra already exists (Supabase created + migrated, Vercel deployed). Configure/verify the domain **`vybz.astramatrix.xyz`** end-to-end: Vercel domain, Supabase Auth Site URL + redirect URLs, email links, SEO.
3. Add music taxonomy (`roles`/`genres`/`daws`/`plugins`) + `creator_roles`/`creator_seeks` (Phase 1).
4. Ship `collab_matches` and prove drummer⇄pianist / vocalist⇄band / guitarist⇄beatmaker surface each other (Phase 2).
5. Build the sound-first feed: track cards, ratings, all-format uploads (Phase 3), then the signature audio-reactive borders + seeded visualizers (Phase 4).
6. Then projects → opportunities → protection layer → swarm → credits → live → rebrand polish ("VYBZ: Find Yours.").
7. After every phase: `npm run build` green, smoke test, commit (when asked).

**North star:** the **next-generation, elite** platform for finding and seeking production collabs — matchmaking with a precision no other platform can touch, and the creative-expression unlock every creator has dreamed of, protected and professional, on one platform. **VYBZ: Find Yours.**
