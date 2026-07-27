# VYBZ — Master Build Bible

> ## **VYBZ: Find Yours.**

**Product:** VYBZ is the next-generation, **identity-first**, **vibes-based genuine
connection platform**. It exists to make real human connection discoverable —
romance, friendship, hangouts, activity partners, creative collaboration, and
professional fit — without ads, without subscription traps, and without paywalling
the ability to meet or talk to people.

**Owner:** Astra Matrix, Inc.  
**Canonical domain:** [`vybz.cloud`](https://vybz.cloud) (legacy alias: `vybz.astramatrix.xyz`).  
**GitHub:** `ALaustrup/VYBZ` (`origin` only — no legacy remotes).

**Status:** This file is the **authoritative source of truth** for product trajectory.
Technical map of the live tree: [`ARCHITECTURE.md`](./ARCHITECTURE.md). Release labels:
[`VERSIONING.md`](./VERSIONING.md) + [`CHANGELOG.md`](./CHANGELOG.md). Security rules:
[`SECURITY.md`](./SECURITY.md). Parked ideas: [`IDEAS_BACKLOG.md`](./IDEAS_BACKLOG.md).

**Doctrine era:** **Vibes** — generation target **Beta-1A** (expansion on the Beta-0B
foundation). Until Beta-1A ships, live code may still skew creator-collab-first; **this
document wins** when code or older brand notes conflict.

> ### Correction of record (read once, then move on)
>
> VYBZ inherited a creator-collab spine (matchmaking, drops, Studio, DMs, Live,
> cosmetics). That spine is **kept and expanded** — it is not discarded.
>
> An earlier doctrine briefly banned dating and other “off-mission” social domains.
> **That ban is revoked.** Love, meetup, friendship, and activity partnership are
> first-class pillars alongside create/pro. What remains permanently banned:
> **anonymity of any kind**, guest/ephemeral aliases, confessions-as-product, AI
> companions as substitute people, ads, and paywalled connection.
>
> Early scaffolding briefly carried unrelated concepts from a prior experiment.
> Anonymous/guest accounts and crisis “lifelines” stay out. The legacy `myvybsocial`
> remote is eradicated — `origin` is `ALaustrup/VYBZ` only.

**Three promises define every decision:**

1. **Genuine connection** — people find people who actually fit their vibes and goals.
2. **Matchmaking precision** — Social Score + complementary signals no other platform
   can casually copy.
3. **Freedom to connect** — messaging, cam, and voice stay free forever; cosmetics are
   optional flair, never a tollbooth.

If a feature doesn’t serve those promises, it doesn’t ship.

---

## 0. What VYBZ IS (and is NOT)

### 0.1 Mission

Genuine connection is hard to find. VYBZ solves that problem.

Users sign up, build the profile they want (sharing only what they choose), and
immediately begin feeding **Social Score** — the living vector of who they are and what
they’re seeking. The platform matches them to opportunities in whatever direction their
life (and their behavior) takes them: a hiking partner within 100 miles, a date, a
bandmate, a mentor, a roommate-to-be, a cofounder, a late-night voice chat friend.

**We are already ~80% done.** The vibes expansion is additive on the shipped identity,
feed, Spark/Connect, DMs, Live/WebRTC, Projects/Studio, and cosmetics foundation. It is
**not** a greenfield rebuild.

### 0.2 The Vibes thesis

“Vibes” is the unifying product metaphor: emotional atmosphere, interpersonal chemistry,
shared energy, aesthetic feel, “we just click,” creative resonance. VYBZ detects,
cultivates, and matches vibes between **real people**.

**Find Yours** means: find the people, rooms, projects, dates, friendships, and
professional fits that match *your* vibes — as revealed by profile signal and how you
actually live inside the product.

### 0.3 It IS

- **A genuine-connection network** for modern loneliness and modern ambition — romance,
  friendship, activity partners, creative collab, and professional fit under one real
  identity.
- **Identity-first.** Every account is a durable human (email + passkey). No guests, no
  ephemeral aliases, no “post anonymously.”
- **Profile-first.** Users design their perfect profile at their own pace. Matching can
  begin the moment meaningful signal exists — not after a forced mode picker or a
  paywall.
- **Explore-and-learn.** No forced “I am here for dating XOR collab” wall at signup.
  Soft declarations accelerate scoring; behavior and profile fill-in do the rest.
- **Three coequal pillars** (see §4): Love & Meetup · Social & Presence · Create & Pro.
- **A free connection stack:** private messaging, cam-to-cam, private voice — unlimited,
  uncapped, never gated (see §8).
- **Living Home (Concept F):** `/` is the user’s **Living Profile Wall** — a MySpace-soul
  personal canvas (you, alerts, people, optional soundtrack/stage) that blooms with
  Intent Mix, not a generic product catalog or Studio-first dock (see §3.4).
- **Cosmetics-primary monetization:** optional profile enhancement packages that help
  someone *stand out visually* because they want to — never because matching is broken
  without them (see §10).
- **A precision Social Score engine** that personalizes feed, Spark, Connect, and
  suggestions (see §6).
- **Still a world-class create/pro workbench** for people who come for collaboration:
  drops, Projects, Studio / Music Repos, exchange protection, role/seek complementarity
  — now as one pillar among equals, not the only door.

### 0.4 It is NOT

- **Not anonymous.** Ever.
- **Not an ad farm.** Zero advertising inventory. Zero sponsored “matches.”
- **Not a subscription dating trap.** No “upgrade to message,” no “see who liked you for
  $29.99,” no competitive edging that lets paid users steal matches from free users as
  the business model.
- **Not fake-account friendly.** Bots, catfish farms, and disposable spam identities are
  treated as existential threats (see §9).
- **Not “SoundCloud with a swipe deck.”** Discovery exists to create **connection**, not
  endless passive scroll vanity.
- **Not a rebuild.** We expand the foundation; we do not throw away working auth, media,
  match RPCs, DMs, or Live paths.

### 0.5 Brand voice

Copy stays **minimal** and human. Tagline: **"VYBZ: Find Yours."**  
Metadata/SEO: **"Find Yours."** (no `VYBZ:` prefix).  
Corporate: `© <year> Astra Matrix, Inc. All rights reserved.`

Tone: honest, warm, adult, never childish, never predatory (“lure into sub”). Every
string should feel like an invitation to a real person — not a funnel.

---

## 1. How to use this document

1. Read §0–§3 (mission, laws, loop) before writing product code.
2. Treat §5–§10 as **requirement contracts** — expansion work must satisfy them before
   claiming a phase done.
3. Obey **Development Rules** (§14) on every change.
4. Prefer [`ARCHITECTURE.md`](./ARCHITECTURE.md) for live route / Edge Function /
   table inventory; prefer this file for *why* and *what must be true*.
5. Everything is **additive and reversible**. Never break a working feature to add one.
6. `npm run lint` and `npm run build` must pass with zero errors before commit.
7. **Expansion freeze rule:** do not begin a new expansion phase until the requirements
   for that phase in §12 are specified here (they are) and the prior phase’s Definition
   of Done is met.
8. Raw owner ideas bank in `IDEAS_BACKLOG.md`; they graduate here when promoted.

---

## 2. Hard product laws (non-negotiable)

These are constitutional. Features that violate them are bugs, not roadmap items.

| Law | Meaning |
|---|---|
| **L1 — Free connection forever** | Matching visibility for genuine fit, DMs, cam-to-cam, and private voice are never paywalled, never metered for revenue, never “freemium-throttled.” |
| **L2 — Zero ads** | No display ads, native ads, sponsored match cards, or affiliate dark patterns that pretend to be people. |
| **L3 — Zero fake accounts** | Identity-first signup; verification/trust tooling; aggressive anti-bot; demo accounts are explicitly labeled and never mixed into “real” discovery without disclosure. |
| **L4 — Zero competitive edging** | Paid cosmetics must not reorder genuine match ranking, hide free users, or invent scarcity. Visual standout ≠ algorithmic privilege. |
| **L5 — Zero connection cost** | Using VYBZ to find and talk to people costs $0 forever. Optional cosmetics are the primary revenue. |
| **L6 — Safety never paid** | Report, block, age gates, consent tooling, and moderation are free and first-class. |
| **L7 — No anonymity** | No guest tier, no ephemeral alias, no anonymous posting. |
| **L8 — Consent & privacy** | Age, sex, location, photo, and looking-for appear in discovery only when the user chose to share them. |
| **L9 — Explainable matches** | Surfaces should show *why* (shared interests, distance, complementarity) — never dark-pattern urgency. |
| **L10 — Additive expansion** | Vibes features expand the Beta-0 foundation; they do not delete Create & Pro capability. |

---

## 3. The experience loop

```text
Signup (identity)
  → Soft Intent Mix intake (multi-select; skip OK)
    → Living Home Wall blooms (modules sized by mix)
      → Profile richness optional; Social Score starts as signal exists
        → Matchable early (minimum viable signal)
          → Explore any pillar via Focus / rooms (Feed, Spark, Studio…)
            → Behavior deepens mix + Social Score
              → Free DM / cam / voice
                → Deeper engagement → better curation → better matches
```

### 3.1 Canonical story (template for every connection type)

1. **User A** signs up and builds their perfect profile — interests (e.g. nature /
   outdoors), photo, age, sex, location, goals — sharing only what they want.
2. **Social scoring begins immediately** as details appear. Other users can begin
   matching with them the moment meaningful profile signal exists.
3. **User B** (existing, nearby, into outdoors, looking for a hiking partner) sees in
   the **global feed**:
   - *“A new user has joined VYBZ — they’re into nature and the outdoors too.”*
   - Thumbnail + **(age) (sex) (location)** when those fields are public.
4. Both are within ~**100 miles**, interests align → genuine opportunity — not an ad,
   not a subscription funnel.
5. They get **every free connection path**: private messaging, cam-to-cam, private voice.

**Curate this pattern for any honest connection:** date, friend, bandmate, mentor,
climbing partner, study buddy, cofounder, creative collaborator.

### 3.2 Cold start fairness

- New users are **not buried** under rich-get-richer ranking.
- Feed may announce relevant new joins to compatible locals / interest peers.
- Algorithmic *pull* intensifies as Social Score gains confidence; early experience is
  exploratory and fair, not empty and not pay-to-appear.

### 3.3 No forced mode fork

Users do **not** have to declare “dating XOR collab” at the door. Optional soft
declarations (“open to dating,” “open to collabs,” “looking for hiking partners”)
**accelerate** scoring and filter decks — they are accelerators, not walls.

### 3.4 Living Home — Concept F (locked)

**North-star articulation:** VYBZ is the ultimate **canvas for connection** — one real
identity whose home blooms into a uniquely curated masterpiece of that person’s desires
and needs (dates, friendship, IRL, collab, presence), without forcing a single use-case
or spawning alternate public “identities.”

**Ship target = Hybrid Living Profile (Concept F):**

1. **`/` = Living Home Wall** (not a generic global Feed as the front door). Hero = you
   (avatar, Focus chips, short vibe line) + Customize. Primary surface = chronological
   **Wall** (messages, matches, applications, live pulses, friend drops) — MySpace-soul
   alerts-on-the-profile, modern media underneath.
2. **Under the fold = Intent Mix modules** (Pulse Board lite): Love / Social / Create
   columns or cards **sized or collapsed by Intent Mix**. Dating-first users never eat a
   Studio wall on day one; mixed users get both without XOR.
3. **Dock is earned:** default **3–5** pins from Intent Mix (e.g. Home · Spark · Messages
   · You). Metronome, VC balance, collabs, open-to-work, etc. unlock via Customize Dock
   or Create weight — not day-one chrome.
4. **Customize** = cosmetics + module toggles + optional soundtrack/stage — flair and
   layout, never paywalled matching (L4/L5).
5. **Public `/u/:id`** = privacy-gated cut of the same living canvas (storefront of a
   real person).
6. **Feed / Discover / Spark / Studio / Live** remain first-class **rooms you enter**
   from Home or dock — they are not abolished; they stop being the default overwhelm.

**Intent Mix (companion lock):** soft multi-select intake seeds pillar weights; progressive
disclosure hides Create facets until Create weight or explicit expand; Focus control
changes ranking/chrome, never username or trust graph. **No swappable public identities.**

**Prerequisite / parallel:** day-theme contrast audit (`data-dark-stage` / surface tokens)
so dark panels stay readable. Upload ownership claims + DMCA ops remain the Create-legality
layer when media tools appear.

---

## 4. Three coequal pillars

One identity. Three doors. Same honesty.

| Pillar | User need | Foundation to expand | Primary surfaces |
|---|---|---|---|
| **Love & Meetup** | Romance, dates, IRL partners (hiking, events, local hang) | Spark deck, geo, safety, looking-for | Spark, feed vibe cards, profile meetup intents |
| **Social & Presence** | Loneliness → real conversation & belonging | DMs, Rooms, Live, WebRTC | Messages, Rooms, Live, private cam/voice |
| **Create & Pro** | Collab, exchange, professional fit | Roles/seeks, `collab_matches`, Projects, Studio, drops | Connect, Opportunities, Studio, Projects, Feed drops |

Pillars share Social Score, identity, safety, and the free connection stack. A user can
live in one pillar or all three over time.

### 4.1 Love & Meetup — requirements

**Must ship (expansion):**

1. **Looking-for model** — dating, friendship, activity partner, “see what happens,”
   custom free-text; multi-select allowed.
2. **Tinder-style Spark deck** expanded beyond creator complementarity: interest overlap,
   geo radius, age preferences (optional), mutual looking-for, Social Score attunement,
   explainable “why.”
3. **Meetup intents** — structured activities (hiking, coffee, jam session, gym, study…)
   with geo + availability soft signals.
4. **Safety pack** — 18+ for romantic intents; clear consent copy; report reasons for
   harassment/catfish/underage; block; optional photo verification path (see §9).
5. **No romantic paywalls** — likes, matches, messages, and video/voice never locked.

**Must not ship:**

- Attractiveness paywalls, “boost to the front of the local stack” as core revenue,
  fake scarcity timers, or bots posing as matches.

### 4.2 Social & Presence — requirements

**Must ship / deepen:**

1. **Private messaging** — realtime, reliable, media-capable; no message caps.
2. **Private voice chat** — 1:1 (and later small group) via WebRTC / LiveKit paths.
3. **Cam-to-cam** — 1:1 video; same free forever rule.
4. **Rooms & Live** — hangout / listening / presence without forcing create/pro identity.
5. **Presence signals** — online/recently active where privacy allows; never sold as a
   premium stalker feature.

**Foundation already present:** `dm_threads` / `dm_messages`, Rooms, Social Live, ICE /
LiveKit edge paths, DM live-audio work (device-validated outside CI VMs).

### 4.3 Create & Pro — requirements (preserve + deepen)

**Keep as first-class:**

1. Complementary role/seek matchmaking (`collab_matches` and successors).
2. Sound-first drops feed, reactions, ratings as taste signals.
3. Projects (profile hubs) + Collabs/Studio + Music Repos.
4. Protected exchange: watermarking, provenance ledger, license chain.
5. Opportunities / commissions board for real work.
6. Creator-adjacent Role Class (booker, patron, curator…) as demand-side identities —
   still identity-first, still no lurker tier.

Create/pro ranking remains excellent for users whose Social Score and declarations lean
that way. It must not monopolize onboarding copy or bury Love/Meetup users.

---

## 5. Profiles — the perfect optional self

### 5.1 Principle

A VYBZ profile is a **storefront of a real person**. Richness is rewarded with better
matches; emptiness is allowed. Nothing required for vanity metrics. Nothing locked
behind payment.

### 5.2 Signal facets (non-exhaustive)

| Facet | Role in matching | Notes |
|---|---|---|
| Photo / avatar | Trust + recognition | Strongly encouraged; accelerates visibility in vibe cards |
| Display name / handle | Identity | Required for account durability |
| Age | Soft/hard filter when shared | Romantic intents require 18+ |
| Sex / gender presentation | Soft filter when shared | User-controlled vocabulary |
| Location + radius preference | Geo matching | Default example radius: **100 miles**; remote-OK flag |
| Interests / vibes tags | Overlap scoring | Nature, music, sports, games, food, … |
| Looking-for | Pillar routing | Dating / friend / activity / collab / pro / custom |
| Bio | Semantic embedding | Feeds Social Score text resonance |
| Create facets | Pro pillar | Roles, seeks, genres, DAWs, plugins, crafts |
| Role class | Demand/supply | Creator vs creator-adjacent |
| Equipped cosmetics | Visual only | Must not alter fit score (L4) |

### 5.3 Early matchability

**Minimum viable signal (MVS)** — exact thresholds are implementation details, but the
product rule is:

- As soon as a profile has enough public signal to justify a human-readable “why”
  (e.g. interests + location, or photo + looking-for, or create roles/seeks), the user
  becomes **matchable** to others.
- Completing more fields increases **confidence** and ranking quality — never unlocks
  the right to exist in the network.

### 5.4 Privacy toggles

Every sensitive field has:

- **Private** (never in discovery cards)
- **Matches only** (visible after mutual connect / match, if applicable)
- **Public** (eligible for feed vibe cards and decks)

Default to conservative for age/sex/precise location; city-level or radius-band is
preferred over street-level.

### 5.5 Profile enhancement (cosmetics)

See §10. Cosmetics decorate the profile; they never substitute for missing identity or
buy algorithmic rank.

---

## 6. Social Score — the core intelligence

### 6.1 Definition

**Social Score** is a living, multi-dimensional vector representing a person’s vibes,
preferences, trust, and engagement — used to personalize their environment and to
precision-compare them with others.

It is **not** a single vanity number shown as “you are 847 points.” External UI may show
confidence labels (“Emerging,” “Attuned”) and explainable reasons — not a leaderboard
of human worth.

### 6.2 Score dimensions (v1 contract)

| Dimension | Inputs (examples) | Used for |
|---|---|---|
| **Interest vibe** | Tags, bio keywords, follows, reacts | Feed cards, friendship/meetup |
| **Geo affinity** | Location, radius, remote-OK | Local partners, IRL |
| **Relational intent** | Looking-for, dating prefs | Love & Meetup decks |
| **Create complement** | Roles/seeks, genres, DAWs, plugins, embeddings | Connect / Spark pro |
| **Taste** | Vyb/Fail, listens, project follows | Soft collaborative filter |
| **Social graph** | Connects, message replies, room co-presence | Trust + “people like…” |
| **Reliability / trust** | Response rate, reports against, verification | Safety downrank / boost |
| **Freshness** | New user boost, recency of activity | Anti rich-get-richer |

### 6.3 Lifecycle

1. **Profile events** — field set/update, photo upload → immediate partial recompute.
2. **Behavioral events** — view, dwell, swipe/connect/pass, message, join room, upload,
   react → append-only event stream (privacy-minimized).
3. **Nightly / on-demand recompute** — aggregate into vectors + confidence.
4. **Pairwise compare** — produce fit, confidence, and why-strings for Spark/Connect/feed.

### 6.4 Relationship to `collab_matches`

`collab_matches` (and LTR weights) remain the **Create & Pro** specialist scorer.
Social Score is the **umbrella**:

- Pro-heavy users → create complement dominates.
- Love/Meetup-heavy users → interest + geo + relational intent dominate.
- Mixed users → blended ranking with pillar-aware decks.

Learning-to-rank expands to outcomes beyond connect/pass (e.g. mutual message, meetup
confirm) without ever optimizing for “who paid.”

### 6.5 Fairness rules

- Cosmetics / tips / credit balance **must not** appear in fit math.
- New accounts get a **fairness boost window**, not burial.
- Diversify result sets; avoid echo chambers of the same 20 popular profiles.
- Hard filters (age min for dating, block lists, remote-only) never soft-violated for
  revenue.

---

## 7. Discovery surfaces

### 7.1 Global feed — vibe cards (first-class)

Beyond drops and project posts, the feed carries **connection discovery cards**:

| Card type | Example copy | Payload |
|---|---|---|
| **New user vibe** | “A new user has joined VYBZ — they’re into nature and the outdoors too.” | Thumbnail, age, sex, location (if public), shared tags, CTA |
| **Nearby intent** | “Looking for a hiking partner near you.” | Intent, distance band, overlap |
| **Shared taste bridge** | “You both vibed with …” | Soft social proof |
| **Create complement** | “Producer seeking vocalist — fits your seeks.” | Roles, why |
| **Live/presence** | “Friends from your graph are in a room.” | Room deep link |

**Rules:**

- Cards are **genuine algorithmic suggestions**, never paid placement (L2/L4).
- Respect privacy toggles (L8).
- Always one-tap path into profile + connect/message.
- Rate-limit so the feed doesn’t become a spam cannon of “new user” noise.

### 7.2 Spark

Swipe/deck surface for high-intent browsing across pillars (mode chips or auto-attuned
mix). Pass/connect outcomes feed Social Score + LTR.

### 7.3 Connect

Ranked list with explainable why — generalized from creator complementarity to full
Social Score compare.

### 7.4 Search & facets

Faceted discovery: interests, looking-for, geo, craft/role, genre/DAW (pro), online-now
(soft). Search never becomes a paid boost marketplace.

### 7.5 Digests

Opt-in weekly digest can include best-fit people + opportunities (already partially
shipped) — never paywalled teases.

---

## 8. Free connection stack

Once two people want to connect, VYBZ provides **every** channel without limits:

| Channel | Status intent | Gate? |
|---|---|---|
| Private messaging | Deepen shipped DMs | **Never** |
| Private voice | Expand WebRTC / LiveKit | **Never** |
| Cam-to-cam | Expand WebRTC / LiveKit | **Never** |
| Rooms / Live hangouts | Deepen Social Live | **Never** |

**Explicitly forbidden monetization patterns:**

- Message caps / daily likes
- “Upgrade to video”
- “Boost to be seen by this match”
- Blurred matches until payment
- Read receipts sold as premium (if read receipts exist, they’re free or absent — not paid)

Infra notes (non-product gates): TURN for strict NAT, LiveKit SFU for groups — these are
reliability investments, not premium SKUs for end users.

---

## 9. Trust, safety, and anti-fake

### 9.1 Identity baseline (shipped spine)

- Passkey-first WebAuthn + email/password fallback
- Anonymous sign-in **off**
- Username claim + durable profile
- Staff roles: member < moderator < admin
- Universal report/flag → `content_reports` → mod queue
- Block / ban paths

### 9.2 Expansion requirements

1. **Age:** romantic Love intents require confirmed 18+ policy; underage romantic
   matching is a P0 incident class.
2. **Verification (phased):** optional photo/ID/liveness verification badges that boost
   *trust confidence*, not paid rank. Free to verify.
3. **Anti-bot:** rate limits, device/browser signals, disposable-email resistance, spam
   graph detection.
4. **Catfish / impersonation report reasons** on profiles and messages.
5. **Meetup safety content** — in-product education (public places, tell a friend) without
   lecture walls.
6. **Demo / seed accounts** — if present, must be clearly labeled (`@vybz.demo` etc.) and
   excluded from “real people” claims in marketing.
7. **Zero tolerance** for CSAM, stalking tooling, and non-consensual intimate imagery —
   existing illegal report path remains; legal process via DMCA/takedown stays.

### 9.3 Safety never paid (L6)

Every safety control is available to free users at full fidelity.

---

## 10. Monetization — cosmetics primary

### 10.1 Primary revenue: Profile Enhancement Packages

Optional, cute, expressive packages that help a profile **stand out visually**:

- Accent gradients, frames, flair badges
- Animated profile flair / reactive cosmetics
- Founder / seasonal packs
- Project/profile skins that never alter match fit

**Purchase motivation:** “I want my profile to look special” — **not** “I can’t get matches
unless I pay.”

### 10.2 Already shipped (keep, reframe)

- Cosmetic store (`cosmetics` / `cosmetic_packages` / `user_cosmetics` / equip RPCs)
- Credits (`mod_points`) via mod rewards + Stripe credit top-ups
- Stripe Connect tips (patron → creator) — **secondary**, must never gate messaging
- No ads

### 10.3 Demoted / constrained

| Idea | Verdict |
|---|---|
| Pro tier that unlocks people / messages / video | **Forbidden** |
| Paid match boosts / queue jumps | **Forbidden** as core model |
| Ads | **Forbidden** |
| Tips | Allowed as peer support; never required |
| Live “visibility boost” | Only if proven not to create pay-to-win match markets; default **off** / later |
| Affiliate gear links | Allowed only if disclosed and **zero** rank influence |

### 10.4 Economic north star

> VYBZ makes money when people love being here and buy optional flair —  
> not when people are lonely enough to pay a toll.

---

## 11. Architecture & foundation (keep)

### 11.1 Stack

- **Frontend:** Vite 6 + React 18 + TypeScript (strict), Tailwind 3, `framer-motion`,
  `react-router-dom` 6, `lucide-react`. Alias `@/` → `src/`. PWA; Capacitor Android present.
- **Backend:** Supabase project `xixmneooyufbeftdfpcm` (Postgres + Auth + Storage + Edge
  Functions). Client = anon key + RLS; privileged logic = `SECURITY DEFINER` RPCs + Edge.
- **Audio:** global `AudioBus` (`src/lib/audioBus.ts`) — shared `AudioContext` → analyser.
- **Media:** Bunny.net public CDN + secure token zone for protected originals; watermark /
  C2PA worker path for exchange protection.
- **Realtime / live:** Supabase Realtime; WebRTC; LiveKit for SFU-class rooms when infra on.
- **Payments:** Stripe (Connect tips, credit top-ups, cosmetic purchases).
- **Build gate:** `npm run lint` (`tsc --noEmit`) and `npm run build`.
- **Hosting:** Vercel → `vybz.cloud`. Secrets never in the client.

### 11.2 Frontend map (high level)

- **State:** `src/store/session.tsx`; player via `AudioBus` / `usePlayer()`.
- **Data:** `src/lib/api.ts`.
- **Shell:** full-bleed bottom **V-Dock** + global player (Orb may evolve; dock remains the
  chrome contract unless explicitly redesigned).
- **Matching facets catalog:** `src/lib/profileFields.ts` (expand for vibes/interests/
  looking-for — do not fork a second source of truth).
- **Pages (foundation):** Feed, Discover, Connect, Spark, Opportunities, Studio, Live,
  Messages, Rooms, Profile, Store, Admin/Mod, Codex/Legal.

### 11.3 Data spine (foundation)

Identity-first tables with RLS: `profiles`, vocabularies (`roles`/`genres`/`daws`/
`plugins`), `creator_roles`/`creator_seeks`, `profile_embeddings`, `drops`/`reactions`,
`assets` + protection ledger, `connections`, `dm_threads`/`dm_messages`,
`collab_posts`/`collab_applications`, Projects/widgets, Studio/repos, live, tips,
cosmetics, reports/staff.

**Core RPCs to evolve, not discard:** `collab_matches`, `public_profile`, `start_dm`,
`my_opportunities`, match learning (`tune_matchmaking_weights` / `mm_w`), digest bundle.

### 11.4 Infra constraints (known)

- CI/VM lacks mic/MIDI — validate cam/voice on real devices.
- TURN + LiveKit SFU flip on when provisioned; product remains free to users.
- Resend SMTP required before broad email volume.
- C2PA worker needs reachable host for production signing; watermark-only fallback is safe.

---

## 12. Expansion roadmap (Vibes generation)

Each phase is additive. **Definition of Done (universal):** builds green; RLS-safe;
manual smoke of the phase story; strengthens genuine connection; violates no Hard Law.

### Phase 0 — Doctrine ✅ (this rewrite)

- [x] Masterplan rewritten for Vibes / genuine connection
- [x] `AGENTS.md` aligned to this doctrine
- [ ] Legal copy pass queued (Terms/Privacy/Community reflect dating/meetup + free
      connection + cosmetics; still identity-first)

### Phase 1 — Profile → Social Score → Feed vibe cards ✅ (2026-07)

**Requirements:**

1. ✅ Profile vibe facets in `profile` jsonb + optional `lat`/`lng` (migration `0063`)
2. ✅ Social Score v0 (`social_scores` / `social_score_events` + `recompute_social_score`)
3. ✅ Early matchability via `profile_is_matchable` + feed generator
4. ✅ Feed **New user vibe** + **Nearby intent** cards (`feed_vibe_cards` + `VibeCard`)
5. ✅ Geo radius (default 100 mi) + haversine when coords present; city fallback
6. ✅ Explainable why-strings on cards
7. ✅ Cosmetics excluded from fit (`cosmeticsExcluded` guardrail in dimensions)

**DoD story:** Hiking-partner narrative — set interests/meetup on profile → vibe cards
appear in feed for compatible nearby users — no payment.

**Client:** `ProfileEditPage` Vibes section; `FeedPage` interleaves vibe cards; `api.feedVibeCards` /
`mySocialScore` / `recordSocialScoreEvent`.

### Phase LF — Profile Dashboard + Live Feed Flow (shipped)

**Doctrine:** The owner's Profile (`/profile`) is the private VYBZ **dashboard**.
The **Live Feed Flow** on that dashboard is the realtime notification system for
every event that relates to the user. Public `/u/:id` pages stay storefronts.

**Canonical story:** User watches Live Feed → *“Aria sent you a direct message.”*
→ click opens a **pop-out** → reply via text, voice message, cam-to-cam, or video
message (all free) → or later open **Profile → Inbox** (unread highlighted;
Block / Report / Delete on hover desktop / swipe-left mobile).

**Laws:** Discovery Feed (drops + vibe cards) stays separate from Live Feed.
`/activity` redirects into Profile Live. Safety actions never paywalled.

**Delivery:** LF-0–LF-4 ✅ (2026-07) — Profile tabs Live / Inbox / You;
`MessagePopout` (text/voice/cam/video); blocks + thread reads; `/activity` →
`/profile?tab=live`. Migration `0065_live_feed_dashboard`.

### Phase 2 — Free connection completeness ✅ (2026-07)

1. DM reliability polish (realtime, media, unread) — shared `useInboxThreads`;
   Messages + Profile Inbox stay in sync; mark-read refreshes dock badge.
2. Private voice 1:1 — callee now captures/adds tracks; ICE candidate queue;
   one-shot `restartIce` on failed; TURN via existing `ice-servers` edge.
3. Cam-to-cam 1:1 — same path in pop-out + Messages; local/remote video tiles.
4. UX audit: zero upgrade CTAs on message/video/voice; “free forever” copy.
5. Entry points: vibe cards, Spark, public profile, FeedHero → Message / voice /
   cam via `FreeConnectActions` + `MessagePopout` (optional auto-start call).

**Validate:** demo `@mayachen` → `@devonblake` DM emits Live Feed
“mayachen sent you a direct message.” (`open_dm` payload). Login
`*@vybz.demo` / `VybzDemo2026!` for two-browser UI smoke (Block/Inbox).

### Phase 3 — Love & Meetup full deck ✅ (2026-07)

1. Spark decks **Love / Meetup / Create** — Love & Meetup via `vibe_matches` +
   `spark_likes` / `spark_act`; Create keeps `collab_matches`. Safety: 18+ romantic
   gate (trigger + client), Report (catfish/underage), Block on cards.
2. Meetup intents (hiking template + generalized list) drive Meetup deck ranking/why.
3. Prefs: distance, age min/max, looking-for, meetup intents (`LoveMeetupFiltersPanel`);
   profile `prefAgeMin`/`prefAgeMax` private.
4. Mutual like → `MutualMatchCelebration` → free Message / voice / cam.
5. `public_profile` strips `birthYear`, age prefs, radius, and `hidden` keys; feed
   vibe cards exclude blocks. Migration `0066_love_meetup_spark`.

### Phase 4 — Cosmetics revenue focus ✅

1. Profile Enhancement Packages (`cosmetic_packages` + `purchase_cosmetic_package`) as
   **primary** monetization; Store shelves packages → accents/flair/frames/scenes.
2. Store / chrome copy celebrates flair (“looks only”), never “get more matches.”
3. Tips opt-in (`FLAGS.tips`); live visibility boost stub off (`FLAGS.liveBoost`); Tip CTA
   demoted below free connect on public profiles.
4. Analytics: `admin_cosmetic_stats` + `admin_match_fairness_guardrail` (Admin → Flair);
   Social Score keeps `cosmeticsExcluded`. Migration `0067_cosmetic_packages`.

### Phase 5 — Create & Pro excellence ✅ (2026-07 slice)

Finish incomplete Create rails inside Social Score (not greenfield sonic vectors yet):

1. Exchange trust: download → Trust widget (`watermarkAt`) + toast; `asset_provenance`
   summary on TrackCards; license-change ledger trigger.
2. Soft Pro upload hints (`PRO_SOFT` / Compose + Bulk) — warn only, never hard-gate.
3. Opportunities poster **Inbox** — accept/decline applications (`respond_opportunity_application`
   → free DM); mark filled.
4. Social Score create axis counts `drop_publish` / `opportunity_post` / `repo_commit`
   events. Migration `0068_create_pro_excellence`.

**Still later / additive:** sonic/audio embeddings, commission escrow, C2PA production
host, Bridge Watch live health, plugin scanner.

### Phase 6 — Living Home + Intent Mix (Concept F) · ✅

1. Soft Intent Mix intake (multi-select; skip OK); progressive Create disclosure.
2. `/` becomes Living Profile Wall (alerts + you + Crew); Feed relocates to `/feed`
   as an entered room (Drops).
3. Intent-aware default dock (≤5 pins); Customize Dock for the rest.
4. Under-fold pulse modules sized by mix; Focus control (Love / Meetup / Create / For you).
5. Contrast audit (`data-dark-stage` on dark panels) + upload ownership claim gate
   (Compose + Bulk upload).
6. Public profile shows privacy-gated living canvas cut (“Open to” chips; no Focus leak).

**Delivered:** `intentMix` jsonb on profile · `RoleIntentOnboarding` soft multi-select ·
`LivingHomePage` at `/` · `FeedPage` at `/feed` · dock seed via `applyDockSeed` ·
progressive Create on `ProfileEditPage` · ownership claim on compose paths · public
“Open to” strip on `UserProfilePage`.

**DoD story:** Dating-first signup → Home feels personal, not a DAW catalog; dock is
tiny; Wall shows messages/matches; user can later expand Create without a second identity.

### Later / infra

- P2P swarm (Phase H legacy), Capacitor packaging, Codex library, brand system polish,
  audio embeddings, plugin scanner — still valid, still additive.

---

## 13. Current foundation inventory (Beta-0B line)

Shipped capabilities the expansion builds on (non-exhaustive; see CHANGELOG /
ARCHITECTURE for detail):

- Identity: passkey-first auth, profiles, role/intent/role-class onboarding
- Matchmaking: Connect + Spark, `collab_matches`, LTR weights, embeddings (`gte-small`)
- Social: feed drops, Projects, DMs, Rooms, Live
- Create: Studio / Music Repos, opportunities/commissions + poster inbox, exchange
  watermark/provenance/license ledger, soft Pro upload hints
- Trust: reports, mod/admin consoles, staff audit, match fairness guardrail
- Money: Profile Enhancement packages (primary), flair credits, Stripe tips/top-ups (secondary)
- Chrome: V-Dock, global player, surface theming, PWA

**Honest gap vs Vibes doctrine:** product copy, onboarding, and match RPCs still skew
creator-collab-first; Love/Meetup + Social Score umbrella + feed vibe cards + guaranteed
free cam/voice completeness are the expansion work (§12).

---

## 14. Development rules

1. **No anonymity, ever.** Never reintroduce guest/anonymous auth or ephemeral aliases.
2. **No connection paywalls, ever.** Reject PRs that meter DMs/cam/voice/matches for pay.
3. **No ads, ever.**
4. **Cosmetics must not buy rank.** Fit scoring codepaths must ignore payment state.
5. **Secrets never touch the client.** Service role, Stripe secrets, LiveKit keys, Bunny
   AccessKeys, OpenAI, Resend — Edge/server only.
6. **RLS on by default.** Sensitive writes via `SECURITY DEFINER` RPCs; `search_path =
   public`.
7. **Idempotent, timestamped migrations.** Never edit applied migrations to change live
   behavior — add new ones.
8. **Validate & sanitize** all input; treat uploads as untrusted.
9. **TypeScript strict; `npm run build` green before commit.** Additive; feature-flag
   risky surfaces.
10. **Mobile-first + a11y** (`prefers-reduced-motion`, labels, focus).
11. **Pillar-neutral chrome.** New UI must not assume every user is a musician — create
    tools can be music-deep without forcing that identity on Love/Meetup users.
12. **Confirm before destructive** production actions (DB wipes, mass bans, force-push).

---

## 15. Legal & brand

Legal (Terms, Privacy, Community, DMCA) must reflect:

- Identity-first accounts (email; passkey)
- **Genuine connection** use cases including dating/meetup/friendship **and** creative
  collaboration / material exchange
- Free messaging / voice / video as product promises (no surprise tolls)
- Cosmetics as optional purchases
- User-uploaded media, license tiers, watermark/provenance disclosure
- **No anonymity clause**
- Age requirements for romantic features (18+)
- Report/block/moderation and DMCA/takedown process

Brand name in copy: **VYBZ**. Tagline: **VYBZ: Find Yours.**

---

## 16. Success criteria

The vibes expansion is successful when:

1. The hiking-partner story works without payment, ads, or trickery.
2. The same pattern works for dating, friendship, and pro collab.
3. New users become matchable as they share — not after a paywall or endless forced wizard.
4. DM, cam, and voice are available without upgrade prompts.
5. Cosmetics feel fun and optional; free users receive genuine matches.
6. Fake accounts and anonymous toxicity stay out.
7. Create & Pro users do not lose capability or precision.
8. `npm run lint` / `npm run build` stay green; RLS holds.

---

## 17. Non-goals

- Subscription-gated matching or messaging
- Advertising inventory
- Anonymous or guest modes
- AI romantic companions as a substitute for people
- Rebuilding the stack from zero
- Pay-to-win discovery as the business
- Street-level stalking maps or non-consensual precise location broadcast
- Child-directed romantic features

---

## 18. Requirement checklist (pre-expansion gate)

Use this as the exit criteria for “doctrine complete / ready to expand”:

### Product doctrine
- [x] Mission = genuine connection / vibes (not collab-only)
- [x] Hard laws L1–L10 written
- [x] Three pillars coequal
- [x] Canonical user story documented
- [x] Cosmetics-primary monetization locked
- [x] Free connection stack locked
- [x] Living Home Concept F + Intent Mix locked (§3.4) and Phase 6 delivered
- [x] Social Score umbrella specified
- [x] Feed vibe cards specified
- [x] Safety / anti-fake specified
- [x] Agent entry docs (`AGENTS.md`) synced
- [ ] Legal pages queued for copy update (incl. upload warranty / DMCA ops polish)

### Engineering contracts (must exist before Phase 1 merge)
- [ ] Profile signal + privacy model migration plan
- [ ] Social Score storage + event taxonomy
- [ ] Feed card types in API/UI contract
- [ ] Match RPC generalization plan (umbrella over `collab_matches`)
- [ ] Geo index strategy (PostGIS or approx)
- [ ] Cam/voice production checklist (TURN/LiveKit)
- [ ] Guardrail test: cosmetic owners ≠ higher fit by payment

---

## 19. North star

VYBZ is where real people find real vibes — a date, a hiking partner, a bandmate, a
friend at 1 a.m. — on a **Living Home canvas** that curates to who they are becoming,
with precision matchmaking, a free path to every conversation medium, and optional flair
for those who want to shine.

**Identity-first. Vibes-matched. Free to connect. Find Yours.**
