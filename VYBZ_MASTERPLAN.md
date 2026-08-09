# VYBZ Masterplan

> **Authority 1 of 5.** Product doctrine. What VYBZ is, what it refuses to be, and the
> order in which it gets built. Contains no repository snapshots, no branch instructions,
> and no status claims — those live in [`STATUS.md`](./STATUS.md).
>
> Version 3 · 2026-08-01 · supersedes all prior masterplans and phase doctrine.

---

## 1. Product identity

VYBZ is an **Audio Intelligence and Release Operating System**.

It exists so that anyone who has finished a piece of audio — whether they wrote it by hand,
produced it with AI assistance, or both — can understand exactly how it measures, correct
what is wrong with it, master it properly, hear how it will translate to the places people
actually listen, prepare a complete and valid release, publish it into VYBZ, and leave with
a verified package that any distributor will accept.

**Positioning (2026-08-09).** VYBZ helps AI-assisted creators finish release-ready work. It
does not fight AI music. It measures what is off (phase, dynamics, artifacts, structure,
vocal tells when those detectors exist), offers reversible automated fixes where honest DSP
can help, and otherwise gives the best actionable advice from measured facts. Sample-pack
workflows and a native storefront sit alongside track finishing. Social and discovery exist
to serve music and craft (Law 3) — never dating (permanently out of scope).

**Core promise**

> Know exactly how your audio measures. Perfect how it sounds. Prepare it for release.
> Hear how it will translate. Publish it into VYBZ. Deliver it everywhere when it is ready.

**What VYBZ is not, today:** a distributor. VYBZ does not deliver to Spotify, Apple Music
or any other DSP, and will not claim to until §11 is satisfied. Until then VYBZ is the best
possible pre-distribution platform with its own native release and listening ecosystem.

---

## 2. Target users

Independent artists and producers finishing AI-assisted or traditional work alone; mixing
and mastering engineers; sound designers; podcasters; field recordists; and other audio
creators who need technical honesty before a release goes out.

The unifying trait is not genre, scale, or tool chain. It is that **nobody is checking their
work for them.** VYBZ is the thing that checks — especially when generative tools leave
phase, dynamics, artifact, or structure problems the creator cannot hear yet.

---

## 3. Core problems

1. Independent creators cannot afford a mastering engineer, so nobody tells them their
   master will clip after codec conversion, or that it is 6 dB louder than the platform
   target, or that their artwork will be rejected.
2. The tools that would tell them are either expensive, scattered across a dozen
   single-purpose utilities, or dishonest about what they actually measure.
3. Distribution platforms accept a release and then reject it days later for reasons
   that were knowable up front.
4. Nowhere lets a creator see what their finished release will actually look and sound
   like to a listener before committing it.
5. Pricing across the category is flat, opaque, and unrelated to what the creator used.

---

## 4. Product laws

These are not preferences. A change that violates one of them is wrong regardless of how
useful it seems.

### Law 1 — Never fabricate analysis

No technical value may be invented, guessed from a filename, derived from a hash, or
substituted with a plausible default and presented as measured data.

- Unavailable → display **"Not measured"**
- Approximate → display **"Estimated — not standards-certified"**
- Simulated or experimental → label it explicitly

"Unavailable" is an acceptable answer. A fabricated technical result never is.

### Law 2 — Repository completion is not product delivery

Code existing, tests passing, a PR merging, a tag being cut, a schema being created, or a
document saying "complete" are **not** delivery. Delivery requires all six of:
implementation · integration · user reachability · deployment · production verification ·
meaningful user value. See §12.

### Law 3 — Audio tools precede social expansion

No generic social feature may outrank analysis, correction, mastering, translation,
validation, or release preparation. Social exists only to serve music and audio: discovery,
professional identity, release presentation, creator support, purchases, education,
technical breakdowns, and audience feedback on published work.

### Law 4 — Collaboration is frozen

Multi-human collaboration is preserved for possible future use and removed from the active
roadmap, navigation, product promises, and engineering queue. Correctly distinguish:

| Concept | Status |
|---|---|
| Live presence, shared cursors, collaborative comments, merge requests, shared sessions, project membership | **Frozen** |
| Solo project version history and content-addressed asset history | Retained |
| One user synchronising across web, desktop and mobile | Retained |
| Contributor names, roles, ownership and royalty splits, rights metadata | Retained |

Language that says "collaboration" or "merge" when it means one person syncing devices
must be renamed.

### Law 5 — VDock becomes stable infrastructure

VDock is the universal player for the entire ecosystem. Once its completion gate (M9) is
satisfied, its core concept stops being redesigned; it is extended through stable
interfaces. VDock never applies undisclosed processing during normal playback.

### Law 6 — V¢ must provide real utility

V¢ is the internal utility credit system for using VYBZ, never a speculative currency.
Every debit corresponds to a disclosed action, a disclosed price, and a ledger entry.
No cryptocurrency framing. No promise of cash redemption unless legally and operationally
implemented. Creator cash settlement is a separate system from V¢ spending.

### Law 7 — External distribution is earned

DDEX files, delivery code, or marketing language do not make VYBZ a distributor. See §11
for the full capability list that must exist and be verified first.

---

## 5. Active scope

| Area | In scope |
|---|---|
| **Analysis** | Validated loudness and true peak, dynamics, phase, stereo, spectral, clipping, silence, translation risk, with full provenance |
| **Findings** | Plain-language explanation of every measurement, with severity, confidence, audible consequence and recommended action |
| **Correction & mastering** | Reversible, non-destructive DSP with preview, bypass, undo, before/after analysis and loudness-matched comparison |
| **Translation Lab** | Honest previews of normalisation, codecs, and device contexts |
| **Release readiness** | Versioned rule sets over audio, artwork, metadata, credits, rights and identifiers |
| **Release Project** | The central workspace every tool connects to |
| **VDock** | Universal playback and comparison engine |
| **VYBZ Store** | Native publishing, preview, listening, purchasing and audio-focused discovery |
| **V¢** | Transparent utility credits |
| **Export** | Reproducible, traceable, distributor-ready packages |
| **Platforms** | Web, Tauri desktop, Capacitor Android; iOS preserved but deferred |

## 6. Explicitly excluded scope

**Permanently removed.** All dating, romantic-intent, love, meetup, swipe and sexually
oriented discovery functionality. This includes swipe decks, love and meetup filters,
romantic matching, intent-mix systems, dating profiles and prompts, dating navigation and
marketing, and the associated flags and tests. Preserved recoverably in Git history; absent
from the active application.

**Frozen.** Multi-human collaboration (Law 4). VR and immersive. Bunny as media origin.
A React Native rewrite. Any Spotify-scale catalogue race.

**Not automatically preserved — each must pass the Law 3 test.** Generic lifestyle feeds,
unrelated private messaging, engagement mechanics, popularity mechanics disconnected from
audio, generic video messaging, cam calls without an audio-production purpose, rooms and
live features without a defined release function, cosmetics without coherent utility.

> Four scope questions remain open and are recorded in [`IDEAS_BACKLOG.md`](./IDEAS_BACKLOG.md)
> as **decision required**: live streaming; messaging, cam calls and rooms; the opportunities
> board and cosmetics; V¢ tipping; and watermarking. No work proceeds on any of them.

---

## 7. Core workflow

```
IMPORT → ANALYZE → UNDERSTAND → CORRECT → MASTER → SIMULATE
       → VALIDATE → PREVIEW → PUBLISH → PLAY → EXPORT → (eventually) DISTRIBUTE
```

Every major tool attaches to a **Release Project**, never behaving as an unrelated
mini-application. A Release Project holds source audio, alternate mixes, masters, reference
tracks, artwork, metadata, credits, rights, analysis results, findings, corrections,
processing history, version history, simulations, release configuration, Store preview,
export packages, and publication status.

---

## 8. Conceptual architecture

Seven systems, each with one responsibility:

**Release Project** — the workspace and the unit of everything else.

**Analysis Engine** — produces measurements and must distinguish measured facts, derived
measurements, heuristic findings, AI interpretations, recommendations and simulations.
These are never combined into an unexplained score. Every measurement records its
algorithm, standard, version, units, confidence, environment, limitations, test vectors,
tolerance, and whether it is authoritative or advisory.

**Findings Engine** — turns measurements into understandable, actionable statements. No
fear-based scoring, no arbitrary red warnings.

**Correction & Mastering Engine** — reversible non-destructive operations. AI may recommend
settings; deterministic DSP performs measurable signal processing wherever practical.
Originals are always preserved and every render is reproducible.

**Translation Lab** — previews how a master behaves across normalisation targets, codecs and
device contexts. Never claims exact emulation of proprietary platform processing.

**Release Readiness & Export** — versioned rules producing human-readable and
machine-readable reports plus complete, checksummed, reproducible packages.

**VDock & Store** — playback, comparison, and the native publishing destination.

Standards to align with where applicable: **ITU-R BS.1770**, **EBU R128**, relevant AES
guidance, and published platform delivery specifications. A meter is never described as
certified merely because its output looks close.

---

## 9. Milestone sequence

Phase numbering is retired. Historical phases are preserved in
[`docs/archive/suite-phases-2026/`](./docs/archive/suite-phases-2026/) and have no planning
authority. There is no "Phase 20."

| ID | Milestone | Purpose |
|---|---|---|
| **M0** | Reality, preservation, baseline | Prove what exists |
| **M1** | Doctrine refoundation | One coherent instruction set |
| **M2** | Product isolation | Remove dating, freeze collaboration |
| **M3** | Information architecture & truthful shell | A product a stranger can understand |
| **M4** | Measurement Integrity Foundation | Defensible meters |
| **M5** | Advanced Analysis Suite | Analysis worth paying for |
| **M6** | Correction & Mastering | Safely improve audio |
| **M7** | Translation Lab | Know how it travels |
| **M8** | Release Assembly & Readiness | A complete, valid release |
| **M9** | VDock Completion | The universal player |
| **M10** | VYBZ Store & native publishing | A real place to release |
| **M11** | V¢ Economy completion | Transparent pricing |
| **M12** | Distributor-ready export | Leave with a verified package |
| **M13** | Limited distribution partnership | **Blocked — owner authorisation required** |
| **M14** | Full external distribution | Long-term gated expansion |

Exactly one milestone is authorised at a time. The authorised milestone is named in
[`AGENTS.md`](./AGENTS.md). Never begin the next one silently.

**This is the only plan.** No parallel initiative, phase track, or programme may run
alongside it. The 2026-08 "premium suite" initiative did exactly that and is withdrawn:
two plans competing for the same surface produced breadth without completion, which is the
failure Law 2 exists to prevent. A second plan is not permitted even when it is described
as complementary.

### Gates must be executable

An exit gate below that can be expressed as an automated check **must** be, and the check
must cite the gate it enforces. A gate that lives only in prose cannot fail a build, so it
cannot stop a regression — §10's M3 gate was satisfied by hand, and nothing prevented it
from silently decaying afterwards.

Where a gate is irreducibly human — "an ordinary user understands the product" — it
requires named owner sign-off recorded in [`STATUS.md`](./STATUS.md), and the milestone is
not closed without it.

## 10. Exit gates

| M | Gate |
|---|---|
| M0 | Repository and production state proven; production SHA known or explicitly unresolved; every existing feature has a disposition; no user work overwritten |
| M1 | One active authority per responsibility; no active file cites stale doctrine; owner approves; no feature code changed |
| M2 | Dating recoverably archived and absent from production builds; collaboration inaccessible and frozen; retained systems pass regression; no destructive database operation |
| M3 | An ordinary user understands the product (**owner sign-off required**); every visible navigation item leads to a functional surface (**enforced by `src/app/routeTruth.test.ts`**); **no fabricated measurement remains**; production visibly reflects the new direction |
| M4 | Core meters defensible; test vectors pass within documented tolerances; results consistent across environments or the difference is disclosed; no placeholder measurement reaches users |
| M5 | Analysis provides value beyond basic readiness; findings reproducible, understandable, actionable; performance acceptable on supported files and devices |
| M6 | Users can safely improve audio; every render reproducible; operations reversible; before/after analysis available; no ambiguous credit deduction |
| M7 | Simulations clearly labelled; claims technically honest; original / master / preview comparable; translation findings lead to actionable corrections |
| M8 | A release assembles without hidden requirements; every warning cites a rule or rationale; packages complete and checksummed; contributor metadata needs no collaborative editing |
| M9 | VDock reliable across web, desktop and Android; correctly represents active processing and simulation; never applies hidden processing; core frozen behind stable interfaces |
| M10 | Creators can publish; listeners can discover, play and support; social functionality is release-centered; publication is a meaningful real-world release preview |
| M11 | All V¢ activity transparent and idempotent; users understand what credits buy; no speculative-finance language; production transactions verified safely |
| M12 | Creators leave with a complete verified package usable with external distributors; export is never misrepresented as DSP delivery |
| M13 | Real releases delivered under valid agreements; operational responsibilities documented; financial and support flows verified; no premature distributor claim |

---

## 11. The distribution path

VYBZ may describe itself as an external distributor only when **all** of the following
exist and have been verified in production:

Delivery agreements or an authorised delivery partner · DDEX ERN generation and validation ·
secure asset transfer · store-specific metadata transformation · UPC and ISRC handling ·
rights and territory management · delivery acknowledgements · rejections and corrections ·
updates and takedowns · royalty statement ingestion · royalty accounting · creator
settlement · tax and compliance operations · fraud and ownership controls · documented
support procedures.

Until then: **VYBZ prepares releases and produces verified packages. It does not deliver
them.** Every surface, document and piece of marketing copy must say so plainly.

---

## 12. Definition of delivery

A capability is delivered only when every row is true and evidenced.

| State | Means | Proof |
|---|---|---|
| Implemented | Source exists on `main` | Commit SHA |
| Integrated | Wired into a Release Project or the shell | Code path |
| Reachable | A user can load it at the intended auth level | Live request |
| Discoverable | A user can find it without being told a URL | Named entry point |
| Deployed | Live on the production alias | Deployment SHA + bundle fingerprint |
| Production-verified | The primary flow was exercised and observed working | Screenshot or recording |
| Meaningful | It changes what a user can do, stated in one sentence | The sentence |

Permitted status vocabulary — never "complete":

`DOCUMENTED ONLY` · `STUB OR SCAFFOLD` · `INFRASTRUCTURE ONLY` · `NATIVE-PLATFORM ONLY` ·
`PARTIALLY IMPLEMENTED` · `IMPLEMENTED BUT NOT DELIVERED` · `DEPLOYED BUT UNVERIFIED` ·
`DELIVERED AND PRODUCTION-VERIFIED`

**Production is the source of truth about the product. The repository is the source of
truth about the code. When they disagree about what a user experiences, production wins
and the documents get corrected.**

---

## 13. Experience direction

VYBZ must feel like a premium creative instrument, not an admin dashboard.

Project-centered · audio-first · visually calm · technically credible · progressive
disclosure · clear measurement hierarchy · fast comparison · unambiguous navigation ·
strong empty states · **no fake data** · consistent across web, desktop and Android.

Target information architecture: **Home · Projects · Analyze · Master · Translation Lab ·
Releases · VYBZ Store · Library · V¢ · Settings.** Unfinished modules are hidden, never
exposed as if complete.

A Release Project workspace surfaces: Overview · Audio · Analysis · Findings · Mastering ·
Compare · Translation · Metadata · Credits · Artwork · Readiness · Store Preview · Export ·
History. Users are never asked to understand internal milestone names.

Every technical result must reveal enough provenance — units, standard, confidence,
threshold source, expandable methodology — that an expert can trust it and a newcomer can
still read it.

---

## 14. Cross-platform strategy

| Client | Best at |
|---|---|
| **Web** | Project management, metadata, release assembly, Store, profiles, reports, billing, moderate browser-compatible analysis |
| **Desktop** | Large files, batch analysis, high-quality offline DSP, mastering, fast previews, local projects, native filesystem, long renders, professional export |
| **Android** | Project review, playback, VDock, reports, findings, Store management, release monitoring, light capture and upload |
| **iOS** | Preserved; signed distribution and TestFlight deferred until separately authorised |

Desktop mastering behaviour is not forced onto mobile where it produces an inferior
experience. Domain code never imports platform SDKs directly — it goes through the
Platform Bridge.

---

## 15. Definition of success

A creator can import a real audio file, receive technically credible measurements,
understand every significant finding, hear the problem, apply a safe correction, compare
the result without loudness bias, create a professional master, preview translation
conditions, assemble accurate release assets, validate against versioned requirements,
preview the complete release in the VYBZ Store, publish it through VDock, use V¢
transparently, export a verifiable distributor-ready package — and trust that VYBZ never
invented a measurement.

The platform does not succeed because it contains many routes, milestones, packages,
migrations, native shells or tests. It succeeds when that journey is completed in
production by someone who does not work here.
