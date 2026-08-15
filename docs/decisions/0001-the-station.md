# 0001 — The Station

**Date:** 2026-08-15 · **Status:** Accepted · **Decided by:** owner

Decision records are append-only. If this is superseded, write a new record and mark this one
superseded. Never edit history.

## Context

VYBZ had two products in its documentation and could not choose between them. `VYBZ_MASTERPLAN.md`
declared an "Audio Intelligence and Release Operating System" whose Law 3 said audio tools must
precede social expansion. `AGENTS.md` declared a "music production social platform" where the
tools were "additive, not the focus", and named a current milestone that did not exist in the
Masterplan's own milestone sequence — while that same file insisted the sequence was the only plan.

A lower authority was overruling a higher one, three statements inside one file disagreed about
whether Suite UX was active, and the file openly admitted parts of itself were "historical".
Sixteen gate tests grepped that prose, so the contradictions were load-bearing.

Meanwhile the codebase was healthy: 714 TypeScript files, 77,321 lines, 111 migrations, 30 edge
functions, all tests passing, production live. **The documentation was the broken part.**

## Decision

VYBZ becomes **the only platform that tells creators the truth about their work**, built on one
synchronized station where listeners answer artist-authored questions while the music plays.

Its components, as specified in `PRODUCT.md`:

- **One station**, synchronized by server clock, programmed in blocks, split only on measured demand
- **Sparks** — artist-placed prompts that appear just after the moment they ask about
- **Two currencies** — Airtime (verified time, unpurchasable) and V¢ (judged value, purchasable),
  which never convert in either direction
- **Charge per answer received**, not per prompt placed
- **The Station is the only reward-bearing surface**; everything else is free and unmetered
- **Publishing is always free**; only the guarantee is earned
- **No public vanity metrics** anywhere

## Why this and not the alternatives

Nine other directions were considered in depth. The three closest:

**Provenance and version control infrastructure** (C2PA-style proof of authorship, content-addressed
history for creative files, derivation lineage with automatic splits). Genuinely defensible and it
uses the unused `repo_*` schema, but it is infrastructure — the cold start is brutal and it does not
answer the emotional question of why an artist posts here first.

**Open studios / presence-first spaces.** The most alive concept, but presence products die empty,
and it needs concurrency on day one.

**A creator's timeline as a permanent verifiable record.** The most conceptually ambitious, with real
privacy exposure from continuous capture, and valuable mostly in retrospect rather than immediately.

The Station won because it is **valuable to a single creator on day one**, it uses the synchronized
radio, playback authority, measurement discipline and credit ledger that already exist, and it
answers the actual wound: releasing work and finding out nothing.

## The competitive finding that shaped the design

DistroKid already built approximately this. It is **Slaps.com**, launched July 2020, gated behind a
DistroKid membership, explicitly modelled on SoundCloud Groups, with a chronological anti-algorithm
feed, 6,033 groups, and an engagement-earns-visibility mechanic.

Retrieved from its live pages on 2026-08-15, its comment sections are wall-to-wall Fiverr promotion
dressed as feedback — the same solicitation reskinned repeatedly, interleaved with rows of
"Spammy or annoying / Delete comment". Its second-largest group is *Spotify_follows*, a
follow-for-follow pod. One artist's own bio has become a manifesto for rules the platform never
enforced: *"Don't spam/self promote on others' tracks… BE AN ARTIST, NOT A FRAUD."*

There is a precedent behind that precedent. The same founder built **Fandalism**, a musicians' social
network that reached 350,000 users, then added distribution as a feature to feed it, discovered users
only wanted the distribution, spun it out as DistroKid, and shut the network down.

**Two conclusions drove our design:**

1. Slaps rots because it **cannot distinguish a real listen from a fake one**. Reciprocity without
   verification always becomes a pod. VYBZ can verify, because every play mints a ticket through
   `audio-play`. That single capability is the entire difference, and it is why locked-transport,
   answer-based earning and per-answer charging are non-negotiable.
2. A network run as a side-feature of a tool business loses every resource fight. Slaps is listed
   under "Goodies" beside Promo Cards. **The Station must be the product, not a retention feature.**

And DistroKid structurally cannot copy this: their revenue is upload volume across 2M+ artists, so
telling an artist that nine people finished their track is the most churn-inducing sentence they
could ship.

## Consequences

**Documentation.** `VYBZ_MASTERPLAN.md`, `STATUS.md`, `IDEAS_BACKLOG.md` and `ARCHITECTURE.md` are
deleted, recoverable from git. Replaced by `PRODUCT.md` (authority), `AGENTS.md` (operations),
`STATE.md` (checkpoint), `docs/decisions/` (this) and `docs/architecture.md` (reference).

**Rules move into code.** `src/product/invariants.ts` holds every enforceable rule. Sixteen gate
tests were rewritten to import it instead of grepping markdown, so prose is no longer load-bearing
and two documents can no longer contradict each other into a stalemate.

**Nothing else is deleted.** Every existing feature stays in the tree, reachable and compiling.
Surfaces leaving the default experience are hidden from navigation only.

**New interface.** The Station becomes the landing experience for all users, mobile-first, with
Android as a first-class target and VR as a considered horizon rather than a commitment.

**Left open deliberately.** All economy constants are `Not measured` until real listening supply and
release demand can be observed. Whether a larger committed budget earns queue priority is unresolved
and will be decided from queue data, not from an armchair.
