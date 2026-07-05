# VYB Audio — Master Build Bible

**Audience:** the LLM/engineer bootstrapping the `vyb-audio` project by forking `myvybsocial`.
**Author:** technical lead for GitHub user `Alaustrup`.
**Status:** authoritative. If this document conflicts with an assumption you hold, this document wins. When something is genuinely ambiguous, prefer the option that is (a) secure by default, (b) additive/non-breaking, and (c) consistent with the inherited conventions described in §3.

---

## 0. What VYB Audio IS (and is NOT)

**VYB Audio is a next-generation social + collaboration network for musicians and producers.** Its single reason to exist is **precision matchmaking between creators and whatever they are looking for**, plus a **frictionless exchange of raw creative materials** (samples, stems, one-shots, presets, MIDI, and full DAW project files).

**It IS:**
- A **complementary-role matching engine.** A drummer seeking a pianist is matched to pianists seeking drummers; a vocalist seeking a band is matched to bands seeking a vocalist; a guitarist seeking a beatmaker is matched to beatmakers seeking a guitarist. Every direction of every pairing that can exist, matched with high precision.
- A **workbench exchange.** Trade samples and **project files for DAWs** (Ableton `.als`, FL Studio `.flp`, Logic `.logicx`, Pro Tools `.ptx`, Reaper `.rpp`, Studio One `.song`, Bitwig `.bwproject`, Cubase `.cpr`), stems, and MIDI — to *build together*, not to sell.
- A **collaboration graph:** opportunities boards, collab rooms, split sheets, credits, versioned project handoffs.

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
- **`confessions`** — the "post" table (body, `photo_url`, `media_kind`, `nsfw`, `seed`, `author_id`, `alias`, `publish_at`). *In VYB Audio this becomes the generic content/drop table — see §6.*
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

**This architecture is exactly what VYB Audio needs.** You will add a *role-complementarity* term and *music-domain* signals on top of it (§7).

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

**Goal:** `myvybsocial` must stay *exactly as it is*. VYB Audio is a **separate repository with separate infrastructure**. There is **zero shared runtime** — never point VYB Audio at MYVYB's Supabase project (schema divergence would corrupt MYVYB).

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
> Cloning with `--origin upstream` keeps a read-only link so you can cherry-pick *bug fixes* from MYVYB later, but VYB Audio's `origin` is its own repo. Never `git push upstream`.

### 4.3 Stand up separate infrastructure
| Concern | MYVYB (do not touch) | VYB Audio (new) |
|---|---|---|
| Supabase project | `xhgmpodfpcxfshaqspgh` | **new project** |
| Vercel project | myvyb | **new project** |
| Domain | `myvyb.astramatrix.xyz` | e.g. `vyb.astramatrix.xyz` or `vybaudio.astramatrix.xyz` |
| Email sender (Resend) | `noreply@astramatrix.xyz` (MYVYB) | reuse verified `astramatrix.xyz` domain, sender name "VYB Audio" |
| Stripe | MYVYB account/products | new product(s) if monetized later |
| LiveKit / OpenAI keys | MYVYB keys | new keys (or scoped) |

- Copy `.env.local` → fill with **new** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, etc. `.env.local` is git-ignored — never commit secrets.
- Apply the **entire** inherited migration set to the new Supabase project first (so you inherit profiles, matchmaking, storage, etc.), then layer the new music migrations (§5–§8) on top.
- Re-run `supabase/configure-email.mjs` against the new project with the VYB Audio template (§10.4).

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

---

## 6. Content model — "drops" & the feed (repurpose `confessions`)

The inherited `confessions` table + `reactions` (Vyb/Fail) is a working feed with voting and matchmaking hooks. **Repurpose it as the generic "drop" feed** rather than schema-churning early:

- Introduce a UI concept **"Drop"** (a post that showcases a work-in-progress clip, a loop, a "seeking" callout, or a finished-idea for feedback). Back it with `confessions` initially; add an `asset_id` FK (nullable) to link a drop to an uploaded asset (§8).
- Keep `reactions` — a **Vyb on a sample-drop is a taste signal** that feeds matchmaking (co-Vyb on samples ⇒ shared sonic taste). This is a *huge* free win: your inherited behavioural matching now means "people who love the same sounds."
- Later (optional, Phase 6+) you may migrate to a purpose-named `drops` table; if so, write a view or rename migration carefully and update `backend.ts`. Not required for launch.

```sql
alter table public.confessions
  add column if not exists asset_id uuid references public.assets(id) on delete set null;
```

---

## 7. THE MATCHMAKING ENGINE (the core of VYB Audio)

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

### 8.6 Definition of Done (Phases 3–4)
Upload a sample → waveform preview plays in-feed; Vyb feeds taste-matching; download recorded. Create a project, add a collaborator, upload a versioned project bundle only they can access, and fill a split sheet.

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
Roles offered/sought get their **own editor UI** backed by `creator_roles`/`creator_seeks` (not jsonb). Update `completeness()` to weight roles, genres, DAWs, influences.

---

## 10. Rebrand map (MYVYB → VYB Audio)

> ~500 brand references exist. Work **file-family by file-family**; verify with `npm run build` after each. **Do NOT blindly rename DB tables or `localStorage` keys** — those cause data loss / churn. Follow the notes.

### 10.1 Brand assets & components
- `src/components/Brand.tsx` — text fallbacks `"MYVYB"` → `"VYB Audio"`; drop new artwork in `public/brand/` (`icon.svg`, `wordmark.svg`).
- `src/components/Copyright.tsx` — `"MYVYB"` wordmark stays a brand token → `"VYB Audio"`; keep `© <year> Astra Matrix, Inc. All rights reserved.` (owner is still Astra Matrix, Inc. — see §13).
- `public/brand/`, `public/icons/*`, `favicon.svg`, `favicon-64.png`, `manifest.*.webmanifest` — replace icons and names.

### 10.2 Metadata / SEO
- `index.html` — `<title>`, meta description, `og:*`, `twitter:*`, `canonical`, JSON-LD `logo`/`name`, subtitle. Set tagline for VYB Audio (e.g. *"Where creators connect."*).
- `public/robots.txt`, `public/sitemap.xml` — new domain.
- `package.json` — `name` (`vyb-audio`), `description`.

### 10.3 Copy & terminology
- User-facing strings in `src/store/AppStore.tsx`, `src/pages/*`, `src/components/*` (toasts like `"Welcome to MYVYB ✨"`, tutorial, onboarding). Reframe "confessions/posts" → **"drops"**, "vibe" language → creator/collab language.
- Legal copy: `src/data/legal.ts` (28 refs) — update service name, add audio/UGC and collaboration/splits clauses (§13).

### 10.4 Email
- `supabase/email-templates/confirm.html` — wordmark `MYVYB` → `VYB Audio`, keep the animated badge pattern, logo → new hosted icon URL, copyright. Re-apply via `supabase/configure-email.mjs` against the **new** project.

### 10.5 Careful — do NOT auto-rename
- **DB tables** (`confessions`, `reactions`, etc.): keep names in early phases (renaming breaks every query + RLS). Repurpose semantically; rename later only via deliberate migration + `backend.ts` update.
- **`localStorage` keys** prefixed `veiled.` / `myvyb.`: keep or write a one-time migration that copies old→new on boot. A blind rename silently logs users out / drops local prefs.
- **Owner admin email** `andrewiguess@gmail.com` in `20260624_0001_...sql` (`grant_admin_for_owner`): keep, or change to the intended VYB Audio owner in a **new** migration — don't edit the historical file on the live DB without care.
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
| **0. Fork & infra** | New repo from `v1.0.0-myvyb`, new Supabase/Vercel/domain, all inherited migrations applied, env wired | App runs identically under new infra (§4.4) |
| **1. Creator identity** | `roles`/`genres`/`daws` taxonomy, `creator_roles`/`creator_seeks`, music jsonb facets, profile editor rewrite (§5, §9) | User sets offers/seeks/genres/DAWs/influences; persists + shows (§5.4) |
| **2. Matchmaking** | `collab_matches` + `my_opportunities` + rebuilt `/connect` + collab swipe (§7) | Complementary pairs surface each other precisely, with "why" (§7.5) |
| **3. Sample/stem exchange** | `assets` + buckets + waveform preview + Vyb-taste feed + download gating (§8.1–8.4) | Upload → preview plays → download recorded (§8.6) |
| **4. Projects & collab rooms** | `projects`/`collaborators`/`versions`/`split_sheets` + private handoff (§8.5) | Versioned private project handoff + split sheet (§8.6) |
| **5. Opportunities board** | `collab_posts`/`collab_applications` UI + matching (§7.4) | "Band seeking guitarist" reaches guitarists; applications with audition clips |
| **6. Tracks & credits** | song/track metadata, discography, verified credits | Users list works + credited collaborators |
| **7. Live & rooms** | Reuse LiveKit for listening/rehearsal/feedback sessions; optional XR listening room | Live collab session works |
| **8. Rebrand polish & launch** | Full §10 rebrand, SEO, legal, email, mobile QA | Clean brand, green Lighthouse, legal complete |

---

## 13. Legal & copyright

- Product/service name in all copy → **VYB Audio**. Corporate owner remains **Astra Matrix, Inc.** unless instructed otherwise: `© <current year> Astra Matrix, Inc. All rights reserved.`
- Update `src/data/legal.ts` (Terms, Privacy, Community, and any DMCA/UGC pages) to reflect: user-uploaded audio and **project files**, an **exchange/collaboration** model (not sales), **license tiers** per asset (`collab-only` / `credit-required` / `free`), **split-sheet/credit** agreements, and a **DMCA/takedown** process for infringing uploads. Add an audio-content acceptable-use clause.
- Keep the frozen MYVYB legal docs untouched in that repo; VYB Audio maintains its own.

---

## 14. Quick-start checklist for the new session

1. Confirm you're on the **VYB Audio** repo, forked from `v1.0.0-myvyb`, with its **own** Supabase project + env. (Never the MYVYB project.)
2. Apply inherited migrations → verify app runs (Phase 0 DoD).
3. Add music taxonomy + `creator_roles`/`creator_seeks` (Phase 1).
4. Ship `collab_matches` and prove drummer⇄pianist / vocalist⇄band / guitarist⇄beatmaker surface each other (Phase 2).
5. Then assets → projects → opportunities → credits → live → rebrand polish.
6. After every phase: `npm run build` green, smoke test, commit (when asked).

**North star:** the most professional, most precise platform for connecting artists and producers with *exactly* what they're looking for — and for exchanging the raw materials to build it together.
