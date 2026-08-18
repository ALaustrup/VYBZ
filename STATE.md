# STATE

The current checkpoint. Every claim cites evidence. Replaces the former `STATUS.md`.

**Date:** 2026-08-18
**Branch:** `continue-next`
**Production:** https://vybz.cloud — last measured landing SHA was **Build 6bcfb4b**.

## Session provenance Phase 4 — 2026-08-18

Host can download a `.vprov` zip (`manifest.json`, `events.jsonl`, `verify.txt`) from an ended sealed session. Badge copy is **Session provenance · Full|Thin**, never “Human certified.” `notAiClaim` is **Not measured**.

`npm run lint` pass. `npm run test` pass — **169 files / 868 tests**. Browser walk **Not measured**.

## Session provenance Phase 3 — 2026-08-18

Declared host-signal ticks ride the same 30s ATC burn clock. Payload is labelled `kind: "declared"` (pointer, key, chat, DAW streaming, live mic track, tab focused). Not a musicianship proof. Not a not-AI claim.

`npm run lint` pass. `npm run test` pass — **168 files / 864 tests**.

## Session provenance Phase 2 + 0106 applied — 2026-08-18

**0106 applied** to `xixmneooyufbeftdfpcm` via `npx supabase db query --linked`. Verified tables: `provenance_sessions`, `provenance_events`.

Phase 2 wiring (`PARTIALLY IMPLEMENTED`): `startLiveSession` opens a provenance row (failure does not block go-live). Each successful `consume_airtime` appends an `atc_burn` event. `endLiveSession` seals before ending the live row. Strength is still computed at seal from measured `host_consume` totals. No download UI yet.

`npm run lint` pass. `npm run test` pass — **167 files / 861 tests**. Browser walk **Not measured**. Web app **not deployed**.

## Session provenance Phase 0–1 — 2026-08-17

Decision [`0006`](docs/decisions/0006-session-provenance.md). `PRODUCT.md` v5. `HUMAN_PROVENANCE` + `humanProvenance` gate. Package proves a measured live session; **refuses** a “not AI” claim.

Migration `0106` (tables + RPCs). Applied 2026-08-18 — see Phase 2 section above.

## ATC Phase 2–3 + 0105 applied — 2026-08-17

**0105 applied** to `xixmneooyufbeftdfpcm` via `npx supabase db query --linked`. Verified tables: `airtime_balances`, `airtime_ledger`, `listen_credit_events`, `listen_credit_sessions`. Verified RPCs: `grant_daily_free`, `get_airtime_balance`, `consume_airtime`, `report_listen_heartbeat`, `can_start_live`, `atc_abuse_review`, `_atc_award_verified`.

| Piece | State | Evidence |
|---|---|---|
| Listen earn | **PARTIALLY IMPLEMENTED** | Viewer heartbeats every 15s. Credit only after 30s focused+playing. Quality from live chat, stay, discovery, first listen — server-side. `award_listen_credit` revoked from authenticated. |
| Host burn | **PARTIALLY IMPLEMENTED** | `can_start_live` requires 300 ATC. Host consumes 30s ticks. Warn at 60s. Exhaustion ends the session. |
| Abuse review | **INFRASTRUCTURE ONLY** | Admin Airtime tab lists 24h earn rows. Not production-walked. |
| Reception bonus / referral / UI meter | Not started | Phase 4–5 |

`npm run lint` pass. `npm run test` pass — **165 files / 853 tests**. Browser walk **Not measured**.

## ATC spec lock + 0104 applied — 2026-08-17

**0104 applied to production** (`xixmneooyufbeftdfpcm`) via `npx supabase db query --linked -f supabase/migrations/20260817_0104_live_source_daw.sql`. Verified:

```
live_sessions_source_check     CHECK (source = ANY (ARRAY['camera','display','both','daw']))
live_sessions_input_mode_check CHECK (input_mode IS NULL OR input_mode = ANY (ARRAY['camera','display','both','daw']))
```

Backfill: **0** existing rows had `source = 'daw'` after apply (no prior `monetization.ingest = daw` rows). `db push` was not used — remote `schema_migrations` still drifts from local filenames.

**ATC Phase 0 (DOCUMENTED ONLY / invariants locked):** `PRODUCT.md` v4. Decision [`0005`](docs/decisions/0005-airtime-credits.md). `AIRTIME_CREDITS` + `ATC_POLICY` + `airtimeCredits` gate. Hosting is no longer described as free. Listening stays free. Station Airtime stays parked and separate. Stripe never mints ATC.

**ATC Phase 1 ledger:** applied with Phase 2–3 (see above).

## Native `source = 'daw'` — 2026-08-17

Go Live inserts `live_sessions.source = 'daw'`. Migration `0104` is **applied** (see above). Client still retries as `display` + ingest on a leftover `23514`.

## Phase C–E — DAW link, companion deck, session desks — 2026-08-17

Implemented the next slice of `implementation_plan.md` on `continue-next`. Nothing already built was deleted.

| Piece | Delivery state | Evidence |
|---|---|---|
| DAW wire protocol + loopback client (`src/features/broadcast/`) | **PARTIALLY IMPLEMENTED** | 19 unit tests in `pluginProtocol`, `dawBridge`, `liveSource` |
| Native VST3 / CLAP / AU plug-in | **NATIVE-PLATFORM ONLY** | Not in this repository. Client talks to `ws://127.0.0.1:48480/vybz-stream` |
| Go Live source `daw` | **PARTIALLY IMPLEMENTED** | Client inserts `source = 'daw'`. Additive migration `20260817_0104_live_source_daw.sql` widens the CHECK and backfills `monetization.ingest = 'daw'` rows. **Not applied** to production. Until it is, a check-violation retries as `display` + ingest. |
| Companion deck `/live/:id/companion` | **PARTIALLY IMPLEMENTED** | Supabase realtime protocol + remote faders. Faders do not change the published mix. |
| In-session desks + post-live Pack Maker link | **PARTIALLY IMPLEMENTED** | Drawer links existing `/tools/*` routes. Stems are not auto-assembled. |

**Not measured:** signed-in browser walk of Go Live → DAW connect → companion faders. No web browser tool was available in this session.

| Command | Result |
|---|---|
| `npm run lint` | pass — `tsc --noEmit` exit 0 |
| `npm run test` | pass — **162 files / 832 tests** |
| `npm run build` | pass — vite production build |
| `npm run check:no-fixtures` | pass — 13 markers absent from `dist/` |
| `npm run test:e2e` | Not measured |

## Strategic Pivot: Live Mix Audio Streaming Platform — 2026-08-17

Owner directed complete product authority pivot: **VYBZ is to become the ultimate live mix audio streaming platform, giving producers and artists a place to produce their music, sound and audio projects with listeners around the world in real time live.**

- **Authority:** `PRODUCT.md` is now Version 3. Decision [`0004`](docs/decisions/0004-live-mix-streaming-platform.md) supersedes [`0003`](docs/decisions/0003-pack-suite-marketplace.md) and [`0001`](docs/decisions/0001-the-station.md).
- **Core Pillars:** Live mix production rooms, direct DAW Master Channel broadcast plug-in (VST3 / CLAP / AU), low-latency LiveKit SFU stereo audio plane, Android multi-device synchronization & companion mode, real-time Sparks feedback, and post-session sample pack monetization.
- **Phase B Delivered:** Primary navigation re-prioritized to lead with Live Mix (`/live`), Living Mix (`/library/mix`), and Collab Rooms (`/rooms`). Responsive stage console implemented in `LiveWatchPage` (side-by-side console on desktop/tablets, stacked on mobile) and `LivePage` (live mix hero stage with HD stereo indicators and genre filters).
- **Preservation:** Non-negotiable PRESERVATION invariant held: **zero** feature code, routes, or database tables deleted. Sample pack pipeline, marketplace, and 9 DSP desks remain fully functional and subordinated to live mix workflows.
- **Validation:** Full unit test suite passes: **158 test files / 808 tests**. Lint clean. Production build succeeds. 13 fixture markers absent from `dist/`.

| Command | Result |
|---|---|
| `npm run lint` | pass — `tsc --noEmit` exit 0 |
| `npm run test` | pass — **158 files / 808 tests** |
| `npm run build` | pass — vite production build |
| `npm run check:no-fixtures` | pass — 13 markers absent from `dist/` |
| `npm run test:e2e` | Not measured |

## Copy rewrite — 2026-08-16

Owner asked for every label, button, heading, and description to be short, plain, and
producer-natural. User-facing strings were cut across the pack pipeline, desks, shop,
landing, menus, and leftover social surfaces. Routes still resolve. Nothing built was
deleted.

Left locked because tests and product law require them: **Music ops**, **Analyzer owns
this drop**, **does not invent listings**, **Pending manual**, **Settle now**, **Settled
off-platform**, **We do not check the address**.

**Not measured:** a signed-in browser walk of the new copy. No web browser tool was
available in this session. Verification is lint + unit tests + production build.

## First paid storefront order — 2026-08-16

Owner-reported and independently measured.

The owner bought the **$1.00** listing and **received the ZIP by email**. That is the
storefront checkout → Stripe webhook → Resend signed-URL path, on production, with real
card rails. Previously this path was code-only.

Measured 2026-08-16 against `storefront_packs_public` (anon): **one** published pack.

| Field | Value |
|---|---|
| Title | Untitled pack |
| Slug | `untitled-pack-hrw5np` |
| Price | `100` cents |
| Preview / cover | both null |
| Created | 2026-08-16T17:58:54Z |
| Public page | https://vybz.cloud/pack/untitled-pack-hrw5np |

**This proves:** a published pack with a ZIP can be paid for, and the buyer gets a download
mail. Platform Checkout and webhook fulfillment are **DELIVERED AND PRODUCTION-VERIFIED**
for this one order.

**Not measured:** Pack Maker assemble, library upload, Library → Pack fetch, whether
**Settle now** was clicked, Stripe Connect payouts (last recorded `payouts_enabled: false`).
Email delivery of this one message was observed by the owner; Resend as a system is not
otherwise measured.

The listing is still live as "Untitled pack". Unpublish or rename when it has served as
the proof.

## What just changed

**Documentation rebuilt from zero** — PR #178, merged @ `18a458ce`. No application behaviour
changed; `src/product/invariants.ts` has zero runtime imports and its identifiers are absent
from `dist/`, verified after build.

**Living Mix** — PR #177, merged @ `d631ae2b`. Rebased onto the rebuilt docs, dropping its edits
to the deleted `IDEAS_BACKLOG.md` and `STATUS.md` and to the rewritten `AGENTS.md`. Code
unchanged; its gate now asserts membership in `GATE_REGISTRY`.

| Action | Detail |
|---|---|
| Added | `PRODUCT.md` — the single authority (The Station) |
| Added | `src/product/invariants.ts` — every enforceable rule, in code |
| Added | `docs/decisions/0001-the-station.md` — the decision and what it rejected |
| Added | `STATE.md` — this file |
| Rewrote | `AGENTS.md` — operations only, no milestone tracking |
| Rewrote | 16 gate tests to import invariants instead of grepping markdown |
| Deleted | `VYBZ_MASTERPLAN.md`, `STATUS.md`, `IDEAS_BACKLOG.md`, `ARCHITECTURE.md` |

Deleted documents remain in git history. **No feature code was removed.**

## Validation on this branch

| Command | Result |
|---|---|
| `npm run lint` | pass — `tsc --noEmit` exit 0 |
| `npm run test` | pass — **147 files / 696 tests** |
| `npm run build` | pass — vite production build |
| `npm run check:no-fixtures` | pass — 13 markers absent from `dist/` |
| `npm run test:e2e` | Not measured |

Measured on `main` @ `faf6ce01`.

## Sparks — Phase 1 (shipped)

Artists place prompts at moments they are unsure about; listeners answer them during
ordinary playback. No station, no scheduling, no economy yet — this proves the mechanic.

| Piece | State |
|---|---|
| Timing engine + curated option sets | `src/features/sparks/sparkEngine.ts`, 20 tests |
| Migration `0098` (`track_sparks`, `spark_responses`, RPCs) | **APPLIED**, `.down.sql` written |
| Listener overlay (dots → ring → prompt → burst) | `SparkOverlay` via `SparkHost` in `App.tsx` |
| Artist desk (place, remove, read results) | `SparkDesk` on the owner's track page |

Verified against production on 2026-08-15, then all rows deleted:

- Place, show, answer and report round-trip: 1 answered, 1 shown-and-silent, 2 shown.
- An all-positive answer set is rejected server-side (`options_not_spanning`).
- A spark within 20s of another is rejected (`too_close`).
- A valid placement succeeds.

**Design rules that hold, enforced in both the engine and the database:** the prompt lands
*after* the moment so it never sits on the passage being measured; every answer set spans
positive, neutral and critical so it can return bad news; a listener who lets it burst is
recorded as **"no response"** rather than inferred to be bored; and the owner sees counts
only, never who answered.

Charging is deliberately absent — the constants are not measured yet.

## Production walkthrough — the spark loop, in a browser

**2026-08-15, signed in as `aireviewer` on https://vybz.cloud.** The first end-to-end UI
verification of a VYBZ feature on the live site.

A temporary drop owned by the reviewer was created, walked, and deleted. Measured:

| Step | Result |
|---|---|
| Sign in, clear the welcome tour incl. the name step | Worked |
| Sparks panel on the owner's Overview tab | Present — "Sparks · 0 of 5", six questions, suggested moments at 0:30 and 8:16 |
| Place a spark at a suggested moment | Placed; counter moved to 1 of 5 |
| Prompt appears during playback | Appeared after 0:30 with "Still with it?" and 🔒 locked in · 😐 drifting · 🚪 lost me |
| Prompt bursts when ignored | Recorded as `no response`, exactly as designed |
| Tap an option | **Recorded** — `option_index 0`, `answered_at 23:40:38` |
| Reception tab | Real figures: 1 person, median stop 2:52 of 8:36, spark counts, drop-off chart |
| Console errors | None |

The gap between `shown_at` (23:30:45) and `answered_at` (23:40:38) is the upsert behaving
correctly: the exposure was recorded on the first pass and the answer filled it in on a later
one, without overwriting the original showing.

All walkthrough rows removed afterwards; sparks, responses and listens are all zero.

## Reception — Phase 2 (shipped)

`drop_plays` only ever recorded that a play happened — `(drop_id, user_id, created_at)`. That
is the same fiction every platform sells. Completion was not measurable at all.

`drop_listens` records one row per listening session with the furthest point reached and
whether playback actually reported the end. The owner gets a **Reception** tab on their own
track: started, finished, distinct listeners, how many came back on a different day, the
median stop point, where unfinished listens stopped, and the spark answers.

| Piece | State |
|---|---|
| Migration `0099` (`drop_listens`, `record_listen`, `listen_report`, `listen_dropoff`) | **APPLIED**, `.down.sql` written |
| Session recorder | `ListenRecorder` in `App.tsx` — checkpoints every 15s, flushes on track change and page hide |
| Reception view | `ReceptionPanel`, owner-only tab on the track page |

Verified against production on 2026-08-15, then all rows deleted:

- 3 sessions across 2 listeners → `sessions 3, listeners 2, finished 1, returning 1,
  median 107s, duration 240s`. The returning count correctly caught the listener who came
  back two days later.
- Drop-off bucketed correctly (60s and 107s of 240s → buckets 2 and 4).
- **A non-owner gets `{ok: false}` and an empty drop-off.** Aggregates never leave the owner.

**Completion is observed, never inferred** — it is set from playback reporting the end, not
from a position crossing a threshold. Listens under 5 seconds are ignored. Unknown track
length reads "Not measured" rather than a substitute. The panel states outright that whether
anyone *enjoyed* it is not measured.

## The Station — Phase 3, first slice (schema only)

Vibes Radio refills its queue by picking a **random** row from the opted-in pool. That is a
lottery: an artist can never be told when their track plays. `station_airings` makes it a
line — first in, first out — so "you are third" is a fact.

| Piece | State |
|---|---|
| Migration `0101` (`station_airings`, submit / cancel / line / claim / aired) | **APPLIED**, `.down.sql` written |
| Migration `0102` (total ordering fix) | **APPLIED** |
| Edge refill wired to `claim_next_airing` | **Not started** — still picks from the pool |
| Artist-facing "you are Nth in line" UI | **Not started** |
| Block programming (dayparting) | Not started |
| Locked transport while on the station | Not started |
| "Your track airs soon" notification | Not started |

**Nothing is user-visible yet.** The database is ready; the radio behaves exactly as before.

Bug found and fixed during testing: two submissions inside one transaction share `now()`, so
`submitted_at < submitted_at` was false both ways and **each row reported itself as first**.
Ordering now compares `(submitted_at, id)` as a row, making it total. Verified with identical
timestamps: `ahead 0` and `ahead 1`, estimated wait 516s, `waiting 2`.

No wall-clock airtime is promised — the wait is `estimatedWaitSec` and labelled an estimate,
because the station also plays bumpers and some tracks have no recorded duration. A gate test
fails if a `scheduled_for` column appears. Private tracks are refused. Claiming is
service-role only, since a client that could claim could jump the line.

Verified against production then cleared: submit, duplicate refused, line position, claim,
mark aired. `station_airings` is empty.

## Uploader rebuild — built, unverified in a browser

Authorised 2026-08-15, built 2026-08-16 on `fix/uploader-diagnosis`.

**Validation:** `npm run lint` clean · `npm run test` 733 passed across 150 files (was 701/148)
· `npm run build` succeeds. Commits `ce3983c3` (hash worker and stall watchdog), `a8419241`
(queue, batch sheet, gate). **Not yet exercised against a real upload** — compiling and passing
tests is not the same as a file reaching storage, and the original defect was a runtime hang.

**Delivered:**

- `src/features/upload/uploadQueue.ts` — enqueue starts the upload in the same tick. Container
  tags fill the form within a second; the decode that measures tempo and key runs *beside* the
  upload, since one is network-bound and the other CPU-bound. Two uploads at a time. An
  auto-detected value never overwrites a typed one, and an edit takes the field permanently.
- `ComposeSheet` is now a list of files, each with its own progress, errors and metadata. One
  bad file cannot take the batch down. Release is only a row insert.
- Hash moved to a Web Worker behind a size guard and a timeout; every failure path resolves
  `undefined` and the drop continues. An absent hash is honest, a lost drop is not.
- `uploadAudio` gained an activity-based stall watchdog rather than `xhr.timeout`, because a
  large master legitimately takes a long time but silence never does.
- Asset-kind picker and VDock settings removed from intake. `VisualPicker` and
  `BulkUploadSheet` remain in the tree, mounted by nothing, per the preservation rule.
- Gate `uploader` registered and enforced in `src/features/prepare/uploaderGate.test.ts`.

**Still open:** per-track artwork (needs a migration — `Drop` has no artwork field).

## Metadata editor — library editing, built 2026-08-16

The editor could only ever draft against a dropped file and save to
`localStorage`; of its sixteen fields only `title` and `artist` had a write path at all.
Measured 2026-08-16: thirteen fields had no column anywhere.

**Migration `0103_drop_metadata` applied** to `xixmneooyufbeftdfpcm`. Verified after apply:
17 columns, RLS enabled, one owner-only policy, both functions present. It deliberately does
**not** duplicate title/artist/album — those stay on `drops`, so a track has one title. Adds
`update_drop_album`, since `drops.album` has been insert-only since `0058`. Identifiers are
length-capped but not format-validated: a real code in an odd shape beats a rejection, and a
format checker is the first step towards generating one.

**Built:** `MetadataLibraryRail` (albums first, then singles) and `dropMetadataApi`. Selecting
an album opens every track, each independently editable, metadata for all of them fetched in
one round trip. Copy now states which of the two things it is doing rather than implying a save.

**Known limitation:** a save is four writes across two tables and is not atomic. If the library
columns succeed and the metadata row fails, the result is partial; the editor reports the
failure but does not roll back. Worth an RPC that does both in one transaction if it bites.

**Not verified against a real track** — lint clean, 733 tests pass, but no album has been
opened and saved in a browser.

## Desks run on tracks you already have — built 2026-08-16

Every desk used to make you drag in a file the system was already holding. Inverted: a desk is
summoned from the track context menu, and desks left navigation.

**Validation:** lint clean · 772 tests across 152 files · build succeeds. Commits `a0f94035`,
`8e600fc5`, `26c4f410`.

Most of the bridge already existed and had been left unfinished — `workingSet` carries a real
Blob across navigation and its `source` union already listed `"library"`, which nothing had
ever set. Correct, Translation Lab and Metadata already hydrated from it.

**Built:** `loadLibraryTrack.ts` (fetch a drop's audio into the working set), `OpenInTool.tsx`,
a Tools group in `buildTrackActions` plus `buildAlbumActions`, working-set hydration for
Converter, Midi Maker and Stem Maker, and gate `trackTools`.

**The rule that matters:** a desk gets the **master via the play ticket, never `downloadAsset`**,
which can apply a forensic watermark. A correction or analysis desk run on a watermarked copy
would be measuring the watermark and reporting it as the track's. The gate forbids the import.

**Navigation:** only Library, Store (flag-gated) and Settings are browsable. Ten desks are
context-menu only. Routes resolve and pages remain, per the preservation rule.

**Bug the gate caught:** `activeSuiteAppId` walked only *visible* apps, so hiding the desks
broke the shell's ability to name the desk you were standing in. It now walks all of them —
visibility governs the launcher, not identity.

**Unverified in a browser:** no track has actually been sent to a desk. Retrieval is modelled on
Pack Maker's proven `fetch(signed url) → blob`, but large-master timing and the abort path have
not been observed.

**Session-only:** `workingSet` does not survive a reload. Send a track to a desk, reload, and
the desk is empty.

**Why:** today the form gates the upload — you type, then bytes move. Flipped, bytes move while
you type, so the metadata form stops being a toll booth and becomes something you do while
waiting. On a large WAV that is the difference between minutes of dead time and none.

**Scope:**

1. **Upload starts the moment a file lands.** Background queue, per-file progress, honest
   per-file error states, and a client-side timeout so a stall fails loudly instead of hanging.
2. **Batch in the drops uploader.** The separate album uploader (`BulkUploadSheet`) is
   **hidden, not deleted** — unmounted and left in the tree, like `ProfileMenu` and the suite
   rail.
3. **Auto metadata from the file**, shown while it uploads, with the user filling gaps.
   `readId3Tags` and `computeWaveform` already exist.
4. **Remove VDock settings from intake.** Backdrop, reactive style and dim are how a finished
   track presents; that belongs on the track page, not before the file has landed.
5. **Remove the asset-type picker.** The drops uploader is for tracks — stems, loops and packs
   deliberately do not auto-ingest into the catalogue, so it is a question with one answer.

**Artwork is a separate slice.** Measured 2026-08-15: `Drop` has **no artwork field at all**.
Artist profiles, projects and storefront packs carry covers; tracks do not. Per-track art means
a migration, a storage path and display everywhere a track appears — sequence it after the
uploader itself.

### Open bug blocking the rebuild

**A single-track upload reached 100% and then did nothing.** Measured on 2026-08-15: no new row
in `storage.objects` and no new `assets` row — the newest of each is from 2026-08-11. So the
request never completed; the bytes were sent and the server never accepted them.

Not caused by the storage lock (migration `0096` changed **read**, not insert) and not a
rejection either, since `uploadAudio` logs `[uploadAudio] storage rejected …` and would have
surfaced a failure toast. A silent hang points at the request still being in flight.

**Read the code 2026-08-15 and the silence is by construction.** `ComposeSheet.post()`
(`src/components/ComposeSheet.tsx` L252–321) clears the progress bar at **L283**, immediately
after the upload resolves. Everything after that runs with no indicator of any kind:

- **L286–289** `sha256Hex(prepared.file)` — hashes the **whole file again** on the main thread.
  Its `.catch(() => undefined)` swallows any failure silently.
- **L300** `createDrop` — `assets.insert`, then `drops.insert` with column fallbacks, then an
  awaited `signAudio` round trip to the `audio-play` edge. No step has a timeout.

So after 100% the sheet is genuinely doing work while showing nothing. **The owner reports the bar had disappeared and the sheet sat idle**, which places the hang
after L283. An insert that *failed* would have returned null and toasted "Couldn't post that
drop", and no toast appeared, so it did not fail — it never returned. That points at
`sha256Hex`: it calls `arrayBuffer()` on the whole file, so a large WAV is fully resident in
memory while a 4K ffmpeg encode is competing for it. SubtleCrypto has no streaming digest, so
there is no incremental version of this on the main thread.
The rebuild must fix the reporting regardless of which one it was: progress hits 100% when
bytes are handed to the network, not when the server accepts them, and the phase after that is
invisible. A slow-but-working upload is currently indistinguishable from a dead one.

Also worth noting for the rewrite: **L261 `prepareUploadFile` decodes the entire file on the
main thread before a single byte is sent**, so the bar sits at 0% through a full decode. That
is the other half of why intake feels dead.

## Live demo data on production

Two sparks are on the owner's **Helix** track at **0:20** and **1:00**, placed deliberately so
the mechanic can be demonstrated. They are real and will collect real answers. Remove them from
the Sparks panel on the track's Overview tab whenever they have served their purpose.

## The Station — build state

**Nothing of The Station is built yet.** What landed is documentation, rule plumbing, and the
Living Mix on-demand surface that predates the decision.

| Piece | State |
|---|---|
| One synchronized station | **PARTIALLY IMPLEMENTED** — clock, queue and pool from OR-043; the line from `0101` |
| Block programming | Not started |
| Sparks (prompt mechanic) | **Phase 1 shipped** — see above; not yet on the station |
| Airtime balance and ledger | Not started — `vc_ledger` exists for V¢ only |
| Per-answer charging | Not started |
| Locked-transport playback | Not started |
| The Last Hour replay page | Not started |
| Artist reception view | **Phase 2 shipped** — see above |
| New mobile-first landing | Not started |
| Hiding non-Station surfaces from default navigation | Not started |

Living Mix (`/library/mix`) shipped as the personal on-demand listening mode described in
`PRODUCT.md` §6. It is deliberately **not** reward-bearing.

## What already exists and must not be deleted

Measured 2026-08-15: **714 TypeScript files, 77,321 lines** across `src` and `packages`,
**111 migrations**, **30 edge functions**.

Notable assets The Station will build on: in-browser BS.1770-4 loudness measurement validated
to ±0.5 LU on a −23 LUFS sine; nine reversible correction operations; `audio-play` as the
playback ticket authority; content-addressed `repo_*` version-control schema (unused); forensic
watermark plus detector and a `provenance_ledger`; a machine-readable app manifest served over
authenticated HTTPS; the Perception Engine; DAW folder detection; WebGL reactive visual engines.

Full inventory is in [`docs/architecture.md`](./docs/architecture.md).

## Playback authority — private-by-default sequence

Airtime depends on verified listening, so this must be finished before the economy means
anything.

| Step | What | State |
|---|---|---|
| 1 | `audio-play` checks `can_user_play_path`, fails closed | **Done** — PR #173, deployed as edge v7 |
| 2 | Client routes **all** playback through tickets | **IMPLEMENTED BUT NOT DELIVERED** — this branch |
| 3 | Lock `audio-assets` storage read to the owner folder | **APPLIED AND VERIFIED** 2026-08-15 |
| 4 | Stop exposing `assets.url` to non-viewers | Designed, not built |

**Step 2** removed the `createSignedUrls` bypass from `signAudio`. The client could previously
sign any object in the bucket with the anon key, which skipped the visibility check entirely.
Ticket minting is now batched at 50 paths per request with batches issued in parallel.

**Step 3 is applied.** The live policy is now:

```
audio-assets read · SELECT · {authenticated}
using ((bucket_id = 'audio-assets') AND ((storage.foldername(name))[1] = (auth.uid())::text))
```

It replaced an open `using (bucket_id = 'audio-assets')` that let any signed-in user read any
object in the bucket. Reversible via the paired `.down.sql`.

### Signed-in production verification — 2026-08-15

**The first signed-in verification recorded for this project.** Performed as
`ai-reviewer-20260809@vybz.demo` (member, not admin) against production.

| Check | Result |
|---|---|
| Password sign-in | HTTP 200, access token issued |
| Mint tickets for two non-owned public paths | 2 of 2 minted, 0 denied, `backend=supabase-stream` |
| Stream a non-owned track | 302 → **206 Partial Content**, `audio/mpeg`, `bytes 0-4095/12389004` |
| Payload is real audio | first bytes `49 44 33` (ID3) |
| Same playback **after** the storage lock | 302 → **206**, unaffected |
| Client signing a non-owned object directly | **HTTP 400 — blocked** |

Service-role callers (`audio-play`, `watermark`) bypass RLS by design, which is why playback
and downloads are unaffected.

**Still Not measured:** library at scale, chat identity, and DM ordering signed in on
vybz.cloud. The audio path and the full spark loop have now been exercised — see the
walkthrough above.

**Step 4** requires the client to request tickets by **asset id** rather than by storage path,
so `assets.url` never needs to leave the server. That is a contract change to `audio-play` and
has not been started.

**Edge drift:** `supabase/functions/audio-play/index.ts` in the repo now evaluates visibility
concurrently instead of once per path. **Not deployed** — production still runs v7, which is
functionally correct but serial. The client works against either; deploying only improves
latency on large feeds.

## Alpha access — self-serve keys

The gate is now **email-tagged, not invite-only**: anyone can generate a key. That is a
deliberate product change. What the email buys is attribution and a throttle, not exclusivity,
and the UI says so rather than implying a verification we do not perform.

| Piece | State |
|---|---|
| Migration `0097` | **APPLIED** to `xixmneooyufbeftdfpcm` — additive; `.down.sql` written |
| `alpha-key` edge function | **DEPLOYED** — version 1, ACTIVE, `verify_jwt: false` |
| Generator UI on landing + invite gate | On this branch |

Measured against production on 2026-08-15:

- Issuing a key returns a code; an invalid address is refused.
- Three keys per address in 24h succeed, the fourth returns `rate_limited_email`.
- Re-issuing revokes the previous unredeemed key — after three issues, **one** was live.
- Live endpoint with no session: `POST /functions/v1/alpha-key` → **200** with a key;
  invalid email → **400**.
- All smoke rows removed afterwards; zero self-issued keys remain.

Throttling lives in `issue_self_alpha_key`, which is revoked from `anon` and `authenticated`
and granted only to `service_role`, so it cannot be reached around the edge function. IPs are
salted and hashed before storage.

Email delivery is best-effort by design — the key is shown on screen, so a Resend failure
never costs a visitor their access. **Email delivery itself is Not measured.**

## Onboarding — the artist name

Choosing a name moved out of the full-page `UsernameSetup` blocker and into **step 2 of the
welcome tour**, immediately after the welcome. Later steps address the creator by that name.

The step cannot be skipped: the tour re-opens whenever the name is missing regardless of the
local completion flag, Skip and Next are withheld on that step, and `finish()` refuses to close
over a missing name. `UsernameSetup` stays in the tree, imported by nothing.

## Known issues carried forward

**Migration `20260811_0094_dm_thread_last_at`** was merged but, as last recorded, not applied.
Not re-measured this turn.

**Stripe payouts disabled** — `payouts_enabled: false`, `business_profile.url` points at a
domain that does not resolve. Dashboard-only fix. Not re-measured this turn.

**Agent verification account.** `ai-reviewer-20260809@vybz.demo` (username `aireviewer`,
member, not admin, alpha access, zero drops) exists for signed-in checks. Its password was
reset on 2026-08-15 so playback could be verified. The owner's account was deliberately not
touched: it is the platform's **only** admin, and adding a shared credential to it would have
weakened the single most privileged login on the platform.

Revoke it whenever, with `update public.profiles set banned = true where username =
'aireviewer';` — its own display name records that convention.

## Next

Authority now matches the till. Application code does not, yet: Pack Maker is still hidden
from the tools launcher. Do not start Station refill.

1. **Settle** the $1 order if it is still Pending manual.
2. **Unpublish or rename** `untitled-pack-hrw5np`.
3. **Pack pipeline** is in the tree (`/make`, stages 0–8). Not yet walked end-to-end
   in a browser this turn.
4. **One producer who is not you.** Until then this is a self-purchase.

Carried over: deploy the updated `audio-play` edge (repo is ahead of the deployed v7;
functionally equivalent, only latency differs), and playback step 4 — tickets by asset id so
`assets.url` stops leaving the server.
