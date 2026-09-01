# STATE

The current checkpoint. Every claim cites evidence. Replaces the former `STATUS.md`.

**Date:** 2026-09-01
**Branch:** `feat/heard-and-node` @ `4f921b76` — [PR #217](https://github.com/ALaustrup/VYBZ/pull/217) (not merged)
**HEAD (main):** `96f38ef5` — merge PR #215
**Production:** https://vybz.cloud — Vercel **`4HaHkwpK8GpbHwJCNBnGTzqTkDow`** READY at `96f38ef5`

## Cinema visual clock fills live — 2026-09-01

**Commit:** `4f921b76` — [PR #217](https://github.com/ALaustrup/VYBZ/pull/217) (not merged)

Full-screen visual clock fills live (`cinemaVisualClockIsLive`, `library-visual-clock`). The stage uses `usePlayerShell` and RAF instead of a timeupdate subscription. Waveform fills from `liveProgress`. Video on the stage gets the same clock and a seek bar (`library-visual-progress`). Space is still a tap. Overlay still recedes. Sound still starts on tap.

**Validate (local):** typecheck (`tsc --noEmit`) pass. Gallery + living-profile + preview: **3 files / 29 tests**. Production `vite build` pass. Combined `npm run test` this unit: **Not measured**.

**Local signed-in walk** (http://localhost:5173 as Andrew): `/library` cinema; maximize opens `library-visual-stage`; clock `0:01 / 0:07` → `0:02 / 0:07` while Pause; waveform seek `0:07 → 0:03`; phone 390×844 clock `0:03 → 0:05`, Escape. Video clock on the stage: **Not measured** (catalog is one audio work). Production walk: **Not measured**.

On PR #217. Not merged. Production walk: **Not measured**.

## Cinema visual Space + video on the stage — 2026-09-01

**Commit:** `7695fa90` — [PR #217](https://github.com/ALaustrup/VYBZ/pull/217) (not merged)

Full-screen visual: Space is a tap (`cinemaVisualSpaceIsTap`, `library-visual-tap`). Video uses the stage, not native controls (no `autoPlay`, no `controls`). Opening visual still starts playback. Overlay still recedes. Sound still starts on tap. Cinema arrows still do not start sound.

**Validate (local):** typecheck (`tsc --noEmit`) pass. Gallery + living-profile + preview: **3 files / 28 tests**. Production `vite build` pass. Combined `npm run test` this unit: **Not measured**.

**Local signed-in walk** (http://localhost:5173 as Andrew): `/library` cinema; maximize opens `library-visual-stage` (audio playing); Space on the stage Pause → Play → Pause; Escape closes; gallery Space still taps play (Play → Pause); phone 390×844 visual Space Pause → Play → Pause, Escape. Video on the stage: **Not measured** (catalog is one audio work). Production walk: **Not measured**.

On PR #217. Not merged. Production walk: **Not measured**.

## Cinema keys — 2026-09-01

**Commit:** `0a074f0c` — [PR #217](https://github.com/ALaustrup/VYBZ/pull/217) (not merged)

Cinema arrows move between works. Space is a tap (`library-cinema-tap`). Arrows do not start sound (`cinemaArrowStartsAudio`). Search, filters, and full-screen keep their own keys. Overlay still recedes. Sound still starts on tap.

**Validate (local):** typecheck (`tsc --noEmit`) pass. Gallery + living-profile + preview: **3 files / 27 tests**. Production `vite build` pass. Combined `npm run test` this unit: **Not measured**.

**Local signed-in walk** (http://localhost:5173 as Andrew): `/library` cinema; Space on the gallery starts playback (`Pause`); ArrowDown keeps it playing (does not start a new work); Space pauses; Space in search does not start playback; phone 390×844 Space starts, ArrowDown stays playing. Production walk: **Not measured**.

On PR #217. Not merged. Production walk: **Not measured**.

## Cinema progress fills and seeks — 2026-09-01

**Commit:** `8d844afb` — [PR #217](https://github.com/ALaustrup/VYBZ/pull/217) (not merged)

Cinema progress fills from a known duration (`cinemaProgressFraction`) instead of sitting empty. Tap or drag the bar to move in the work (`seekFraction`). Tap play on an ended work starts from the start. Overlay still recedes. Sound still starts on tap. Empty cinema stays the gallery.

**Validate (local):** typecheck (`tsc --noEmit`) pass. Gallery + living-profile + preview: **3 files / 23 tests**. Production `vite build` pass. Combined `npm run test` this unit: **Not measured**.

**Local signed-in walk** (http://localhost:5173 as Andrew): `/library` cinema; tap-to-play; bar filled `0.015 → 0.095` then seek to `0.36`; center click sought to `0.5` without toggling Play; ended tap restarted from `scaleX 1 → 0`; phone 390×844 Pause + progress, seek `0.50 → 0.70`. Production walk: **Not measured**.

On PR #217. Not merged. Production walk: **Not measured**.

## Cinema empty stays the gallery — 2026-09-01

**Commit:** `47020c8a` — [PR #217](https://github.com/ALaustrup/VYBZ/pull/217) (not merged)

Cinema empty match stays a cinema tile (`library-cinema-empty`) so the gallery frame does not collapse. Show all restores the catalog (`library-cinema-clear`). Playing (or paused) work shows display-only progress on the tile (`library-cinema-progress`); RAF + `getPlaybackProgress()`, no seek. Overlay still recedes. Sound still starts on tap. Grid / list / table / shelves still use desk EmptyState.

**Validate (local):** typecheck (`tsc --noEmit`) pass. Gallery + living-profile + preview: **3 files / 20 tests**. Production `vite build` pass. Combined `npm run test` this unit: **Not measured**.

**Local signed-in walk** (http://localhost:5173 as Andrew): `/library` cinema; Image chip empty match keeps `.library-cinema` (tile 542px desktop / 696px at 390×844); Show all restores the work; tap-to-play shows Pause and `library-cinema-progress`; overlay `data-cinema-chrome=hidden` with reveal; list Image empty is desk EmptyState (no `library-cinema-empty`). Production walk: **Not measured**.

On PR #217. Not merged. Production walk: **Not measured**.

## Cinema tools stay put — 2026-09-01

**Commit:** `a7414a20` — [PR #217](https://github.com/ALaustrup/VYBZ/pull/217) (not merged)

Cinema search, filters, views, and sort stay on screen. Kind chips scroll. Library counts **works**, not tracks (`library-count`). Overlay still recedes. Mixes still in More.

**Validate (local):** typecheck (`tsc --noEmit`) pass. Gallery + living-profile gates: **2 files / 16 tests**. Production `vite build` pass. Combined `npm run test` this unit: **Not measured**.

**Local signed-in walk** (http://localhost:5173 as Andrew): `/library` cinema `library-count` is `1 work`; phone 390×844 search, filters, view menu, and sort all `inView`; chips overflow (`scrollWidth` 254 / `clientWidth` 132); view menu tap expands Cinema/Grid/List/Table/Shelves; Image chip empty match; desktop 1280 `sameRow`. Production walk: **Not measured**.

On PR #217. Not merged. Production walk: **Not measured**.

## Cinema header is quiet — 2026-08-31

**Commit:** `ee063c18` — [PR #217](https://github.com/ALaustrup/VYBZ/pull/217) (not merged)

Library header is **Works, This device, and Upload**. Mixes, Projects, and scans stay in More (`library-more-sections`) — routes and testids stay. Phone cinema collapses the five view icons into one control (`library-view-menu`); sm+ still shows all five. Cinema tile scrim is lighter so the visualizer reads. Overlay still recedes. Grid / list / table / shelves stay.

**Validate (local):** typecheck (`tsc --noEmit`) pass. Gallery + living-profile + Living Mix gates: **3 files / 21 tests**. Production `vite build` pass. Combined `npm run test` this unit: **Not measured**.

**Local signed-in walk** (http://localhost:5173 as Andrew): `/library` cinema header is Works / This device / More / Upload; More opens Mixes, Projects 0, 6 scans; Mixes tab `library?tab=mixes` with Mix this catalog; Works returns to cinema; This device honesty copy still present; phone 390×844 More + Upload, view menu expands Cinema/Grid/List/Table/Shelves, List still stacks chips. Production walk: **Not measured**.

On PR #217. Not merged. Production walk: **Not measured**.

## Cinema overlay one bar — 2026-08-31

**Commit:** `a384a171` — [PR #217](https://github.com/ALaustrup/VYBZ/pull/217) (not merged)

Cinema overlay is **one bar**: kind chips (All / Audio / Image / Video / File) sit on the same row as search, filters, views, and sort. Search is an icon that expands on focus. Full-screen visual stays on the tile on phone (`library-visual-toggle` from `sm`). Grid, list, table, and shelves still stack chips below the toolbar. Overlay still recedes while you watch.

**Validate (local):** typecheck (`tsc --noEmit`) pass. Gallery + living-profile gates: **2 files / 16 tests**. Production `vite build` pass. Combined `npm run test` this unit: **Not measured**.

**Local signed-in walk** (http://localhost:5173 as Andrew): `/library` cinema; chips and cinema view `sameRow` (tops within 12px) at 802px and 1280px; phone 390×844 `sameRow`, search expands to 176px without overlapping File; Image chip empty match; list and grid chips stacked below toolbar (`stacked: true`). Production walk: **Not measured**.

On PR #217. Not merged. Production walk: **Not measured**.

## Cinema overlay recedes — 2026-08-31

**Commit:** `aaa5d6fd` — [PR #217](https://github.com/ALaustrup/VYBZ/pull/217) (not merged)

Cinema overlay (tabs, search, views, sort, kind chips) recedes ~1.4s after tap-to-play, and when the gallery scrolls. Tap the top strip to bring it back. Filters, search focus, and reduced motion keep it. Title, play, and full-screen stay on the tile. `cinemaChromeShouldHide` is tested. Grid / list / table / shelves keep their chrome.

**Validate (local):** typecheck (`tsc --noEmit`) pass. Gallery gates + preview: **3 files / 19 tests**. Production `vite build` pass. Combined `npm run test` this unit: **Not measured**.

**Local signed-in walk** (http://localhost:5173 as Andrew): `/library` cinema; tap-to-play; overlay `data-cinema-chrome=hidden` with reveal control while Pause is showing; title still on the tile; top strip restores overlay; hamburger stays. Production walk: **Not measured**.

On PR #217. Not merged. Production walk: **Not measured**.

## Library cinema fills the page — 2026-08-31

**Commit:** `1b0068e4` — [PR #217](https://github.com/ALaustrup/VYBZ/pull/217) (not merged)

Cinema tiles are the remaining viewport (100cqh of the gallery scroller), not `100dvh − 19.5rem`. Tabs, scans, search, views, sort, and kind chips overlay the top of the media. Title, play, and full-screen sit at the bottom of the tile, above the dock. Group lives in Filters (`library-group` stays in the DOM). Grid, list, table, and shelves stay. Sound still starts on tap.

**Validate (local):** lint (`tsc --noEmit`) and typecheck pass. Combined `npm run test`: **207 files / 1048 tests**, **8 failed** under load (DSP 5s timeouts: silence trim, streaming-norm preview, loudness gain, loudness match, M6, M7). Those six files re-run in isolation: **23 passed**. Production `vite build` pass.

**Local signed-in walk** (http://localhost:5173 as Andrew): `/library` cinema fills the gallery; title “Odd Frecuency…” visible above the dock; tap-to-play sets dock Now playing; full-screen visual 1/1 and Escape closes it; list, table, shelves, and grid still render; Image kind chip empty match; sort Title A–Z; This device honesty copy still present; phone 390×844 cinema tile fills, title in view, Upload + kind chips. Production walk: **Not measured**.

On PR #217. Not merged. Production walk: **Not measured**.

## Library cinema gallery — 2026-08-31

**Commit:** `0cd14072` — [PR #217](https://github.com/ALaustrup/VYBZ/pull/217) (not merged)

Library is a **media gallery**, not a forge desk. Cinema is the default view (grid, list, table, and shelves stay). Snap-scroll tiles; video may muted-preview in view; **sound starts on tap**. Full-screen visual uses existing DropStage / TrackVisualizer via OverlayPortal. `LIVING_PROFILE.libraryIsMediaGallery` locked. ToolWorkbench + `library-desk` stay.

**Validate (local):** lint (`tsc --noEmit`) and typecheck pass. `npm run test` earlier this session: **207 files / 1047 tests**. After this unit the suite is **207 files / 1048 tests**. Combined `npm run validate` then hit three DSP tests at the 5s timeout under load (`loudnessMatchCompare`, M6 loudness gain, M7 streaming preview); those three files re-run in isolation: **18 passed**. Production `vite build` pass after the gallery CSS.

**Local signed-in walk** (http://localhost:5173 as Andrew): `/library` cinema default; one audio tile (Odd Frecuency…) with AUDIO label + maximize; tap-to-play sets dock Now playing; full-screen visual 1/1 with waveform and Escape to close; list, table, shelves still render; Image kind chip empty match; sort Title A–Z then Newest first; This device tab still opens; phone 390×844 still cinema + Upload + kind chips. Production walk: **Not measured**.

On PR #217. Not merged. Production walk: **Not measured**.

## Creative Library intake — 2026-08-31

**Commit:** `0860a116` — [PR #217](https://github.com/ALaustrup/VYBZ/pull/217) (not merged)

Library intake is **Creative Work**, not a song catalog. Compose accepts audio, image, video, and allowed files (`CREATIVE_ACCEPT`). Video stays video — extract lives in Convert. New files default **private** and save into `/library`. Place on your VYBZ is unchanged (ids only, one catalog). Stage File classifies placed drops (`classifyDrop`) instead of forcing audio. AudioBus does not play image/video/file URLs. `LIVING_PROFILE.libraryIngestsUniversalWork` locked. Gate `creativeLibrary`.

**Validate (local):** `npm run validate` pass (2026-08-31). lint (`tsc --noEmit`), typecheck, **206 files / 1041 tests**, production `vite build`.

**Local signed-in walk** (http://localhost:5173 as Andrew): `/library` shows Library / Your work / `1 work · 0 on this device` / Upload; kind chips All / Audio / Image / Video / File; Image filter shows empty match (the one work is audio); Upload opens compose **Drop files here** with accept including `image/*` and `.pdf`; This device honesty copy still present; Home library panel still `1 work · 0 on this device` and Place; phone 390×844 still shows Upload + kind chips. Production walk: **Not measured**.

On PR #217. Not merged. Production walk: **Not measured**.

## Menu-only chrome + discovery Home — 2026-08-31

**Commit:** `118d67d2` — [PR #217](https://github.com/ALaustrup/VYBZ/pull/217) (not merged)

Default chrome is the **menu**. Search, +, Chat, Alerts, Me, Tools, and the V¢ wallet identity live in `ShellNavDrawer` / `DrawerChrome` on every viewport. `ContextualAppBar` is hamburger only (Back stays on nested routes). `PrimaryRail` and `VDockSocialStrip` stay in the tree, unmounted. Signed-in `/` centers the VYBZ mark (`BrandMark orb reactive`) as a gentle hue + audio neon pulse. Home composes existing live, rooms, library (`HomeLibraryPanel` — measured `countDropsBy` / `listVisibleCatalog`), taste, and Hear (`FeedPage` Latest / Following / Explore). No Phantom / NFT / SOL. V¢ is not a chain token.

**Validate (local):** lint (`tsc --noEmit`), typecheck, **204 files / 1031 tests**, production `vite build` (2026-08-31). Full `npm run validate` was run as those four steps in this session.

**Local signed-in walk** (http://localhost:5173 as Andrew): header is hamburger only; Home mark + Find Yours. + `@Andrew · ~Andrew`; drawer has Search / Upload / Generate / This device / Chat / Alerts / Tools / Me / wallet `~Andrew`; library panel `1 work · 0 on this device`; Explore shows Shuffle; Library `/library` Works (1) and `/library?tab=device`; phone viewport 390×844 stacks the same Home. Production walk: **Not measured**.

On PR #217. Not merged. Production walk: **Not measured**.

## Heard, identity, Node tool — 2026-08-31 (local)

**Branch:** `feat/heard-and-node` @ `9471c477` — [PR #217](https://github.com/ALaustrup/VYBZ/pull/217) (not merged)

Signed-in `/` stays the people-first social landing. Underground work is hearable via **Explore** (`listDiscovery` / `discovery_feed`) on Home. Taste matches mount as a Follow strip (`TastePeopleStrip`); archived `DashMatchPanel` stays in the tree. Search titles `/` as **Home**, not My VYBZ. The Asset Node is a Search and `+` tool at `/library?tab=device` — not a `/devices` rail kingdom. Bytes stay on device; cloud metadata is names and sizes; Swarm is not this catalog.

**PR #216** remains open (chrome uniqueness). This branch is from `main`, not stacked on #216.

**Validate (local):** `npm run validate` pass (2026-08-31). lint, typecheck, **204 files / 1031 tests**, production build.

**Local signed-in walk** (http://localhost:5173 as Andrew): Home shows Latest / Following / **Explore**; Explore activates Shuffle; `+` includes **This device** and opens `/library?tab=device` with honesty copy; Search `node` ranks **This device**. Taste strip had no matches on this account (hidden). Production walk: **Not measured**.

Production walk: **Not measured**.

## PR #215 — merged — one Alerts; dashboard is Stage File — 2026-08-31

**Merge:** `96f38ef5` — Chat owns messages; one Alerts in top chrome; owner dashboard is `/u/:id`.

**Production deploy:** Vercel **`4HaHkwpK8GpbHwJCNBnGTzqTkDow`** READY on `vybz.cloud` at `96f38ef5`.

Production walk: **Not measured**.

## PR #214 — merged — social rooms on home — 2026-08-27

**Merge:** `1a0d4097` — `SocialRoomsPanel` on signed-in home (Gather section).

**Production deploy:** Vercel **`BL7VfaoQGQiAQGxRDiQFHkhmUL3C`** READY on `vybz.cloud` at `1a0d4097` ([deploy](https://vercel.com/astramatrix/vybz/BL7VfaoQGQiAQGxRDiQFHkhmUL3C)).

Production walk: **Not measured**.

## PR #213 — merged — D2 social home route — 2026-08-27

**Merge:** `e2adb2d5` — signed-in `/` is people-first social landing; owner Stage File at `/u/:id`.

- `SocialHomePage` at `/` — identity strip, live, people discovery, work stream
- `/feed` → `/`; PrimaryRail **Home** at `/`
- Identity menu: **My VYBZ** → `/u/:id`; **Open public VYBZ** → visitor preview
- Gate `livingProfilePhase2c`; `PRODUCT.md` + decision 0011 Phase 2C

**Production deploy:** Vercel **`Fq6boH5haHf7rs2JpZQrDvR3EHsv`** READY on `vybz.cloud` at `e2adb2d5`.

Production walk (2026-08-27): Owner confirmed — `/` shows People & live; **My VYBZ** → owner Stage File; **Open public VYBZ** → visitor preview.
## PR #212 — merged — no autoplay + intro tagline — 2026-08-27

**Merge:** `f9f59c79` — intro **Find Yours.**; featured player tap-to-play; Vibes Radio metadata-only sync (no load autoplay).

**Production deploy:** Vercel **`BcePpVeu3reXtHEsVBgAWZBZBSxw`** READY on `vybz.cloud` at `f9f59c79`.

Production walk: **Not measured** for this slice.

## PR #211 — merged — Vercel validate merge gate — 2026-08-27

**Merge:** `53d8c65e` — `npm run validate` pipeline, Vercel Preview gate, branch protection docs.

- `npm run validate` — lint → typecheck → test → production build
- `vercel.json` `buildCommand`: `npm run validate` (Preview + Production)
- Gate `validatePipeline` + [`docs/engineering/VERCEL_BRANCH_GATE.md`](docs/engineering/VERCEL_BRANCH_GATE.md)
- GitHub `main` branch protection: **Vercel** status required (`strict: true`) — applied 2026-08-27

**Pre-merge proof:** Vercel Preview **Pass** — deployment `GrGU64iZShJVpWxGzUXSrteSTzLN` at `56762264`; full validate in build log.

**Production deploy:** Vercel **`9P8iPFjgps2YDSzKAgMQPbs7oKcf`** READY on `vybz.cloud` at `53d8c65e`; build ran `npm run validate`.

Production walk remains release evidence — compile gate does not prove presence, auth, or persistence.

## PR #210 — merged and deployed — 2026-08-26

**Merge:** `8f173164` — Living Profile stack (Phase 7 Hide, Phase 1a shell, Generate intake, Phase 2 owner pulse, Phase 2B live profile presence).

**Deploy:** Vercel production `dpl_Gb93Bx5G3zjGqhxGSk8rxLKVoZc9` READY on `vybz.cloud` at `8f173164`.

**Pre-merge smoke test (2026-08-25):** Owner signed-in walk — all checklist items pass (Hide, shell, Generate intake UI, owner pulse, live profile presence).

**Post-merge production verification:** HTTP 200 on `https://vybz.cloud`. Signed-in feature walk on live production build: **Not measured** (pre-merge smoke assumed still valid; re-walk optional).

`npm run lint` pass. `npm run test` pass — **201 files / 1015 tests**. `npm run build` pass.

## PR #210 review pass — 2026-08-25

Final in-scope review fixes before production smoke test:

| Fix | File(s) |
|-----|---------|
| Profile live embed subscribe-only unless GoLive handoff exists (no duplicate camera/mic publish) | `useProfileLivePlayback.ts` |
| Fall back to static banner when session ends (`onSessionEnded` / `liveBannerDismissed`) | `ProfileLiveStage.tsx`, `ArtistStageProfile.tsx` |
| Viewer bump only decrements when increment succeeded | `useProfileLivePlayback.ts` |
| Generate button disabled until worker probe succeeds | `GenerateSheet.tsx` |
| VDock **Me** highlights on `/u/:userId` like PrimaryRail | `VDockSocialStrip.tsx` |

Gate tests updated. `npm run lint` pass. `npm run test` pass — **201 files / 1015 tests**. `npm run build` pass. Pushed at `c4ebf52a`.

**Production smoke test (2026-08-25):** Owner signed-in walk — **all checklist items pass** (Hide, shell, Generate intake UI, owner pulse, live profile presence). Evidence: owner confirmation in session. Merged to `main` at `8f173164`; deployed `dpl_Gb93Bx5G3zjGqhxGSk8rxLKVoZc9`.

## Phase 2B — Live profile presence — 2026-08-25

When a host is live, the Profile banner becomes the primary live-presence surface: inline SFU/HLS playback via `useProfileLivePlayback` (same graph as `LiveWatchPage`, no MusicDock route). Scrolling past the banner shows a restrained sticky “Return to live” bar; playback stays on the single banner video element. Owner sees **Manage live** → `/live/:id`; visitors get **Chat** → full session page. Live chip removed from `ProfileOwnerPulse` (banner is primary). `/live` network discovery unchanged. `LIVING_PROFILE.liveIsProfilePresence` locked. Gate `livingProfilePhase2b` registered.

Production walk: **Pass** — owner smoke test 2026-08-25 (all checklist items).

`npm run lint` pass. `npm run test` pass — **201 files / 1014 tests**. `npm run build` pass. Pushed; PR **#210** open.

## Checkpoint commits — 2026-08-25

Separated uncommitted work on `feat/stable-audio-generate` (Phase 7 Hide already at `6ecfced3` — not duplicated):

| Commit | Intent |
|--------|--------|
| `c49c5f64` | `feat(shell): add primary rail, mobile drawer, and VDock social strip` |
| `5e823e83` | `feat(generate): add local Stable Audio generation intake` |
| `0aaf8265` | `feat(profile): add living profile owner attention pulse` |
| `5cb8cbba` | `chore(product): register living profile invariants and gate tests` |

Full validation after checkpoint: `npm run lint` pass. `npm run test` pass — **200 files / 1007 tests**. `npm run build` pass.

## Phase 2 — Living Profile owner pulse — 2026-08-25

First reversible slice: `/` stays `MyVybzHome` → `UserProfilePage` → `ArtistStageProfile`. Owner-only `ProfileOwnerPulse` surfaces unread messages and alerts as ambient chips (no dashboard panel; live moved to Phase 2B banner). Identity menu adds **Open public VYBZ** → `/u/:id` alongside **My VYBZ** → `/`. `LIVING_PROFILE.everyExperienceHasAnEquivalent` and `profileOwnerAmbientAttention` locked. Gate `livingProfilePhase2` registered.

`npm run lint` pass. `npm run test` pass — **200 files / 1007 tests**. `npm run build` pass. Production walk: **Pass** (included in PR #210 smoke test).

## Phase 1a — Shell scaffold and token alignment — 2026-08-25

Desktop mounts one adapted `PrimaryRail` (Me, Messages, Live, Library — truthful routes only). Narrow viewports collapse the rail into `ShellNavDrawer` (hamburger in app bar; Esc + tab focus trap). `ContextualAppBar` unchanged in role. `VDockSocialStrip` adds compact social shortcuts above the existing `MusicDockPlayer` — one dock, one AudioBus graph. `/` content and owner/visitor Stage File behavior unchanged. D2 target direction documented in `PRODUCT.md` §14 (Phase 2 route move not shipped). `LIVING_PROFILE.desktopPrimaryRail` and `mobileNavDrawer` locked.

Screenshots captured via non-deployable e2e shell fixture (`/__e2e__/shell` at 1280 / 768 / 390 px). Signed-in production smoke walk: **Pass** (2026-08-25, owner confirmation — see PR #210 review pass section).

`npm run lint` pass. `npm run test` pass — **199 files / 1003 tests**. `npm run build` pass. Not committed. Not pushed.

## Generate — local Stable Audio 3 first slice — 2026-08-25

License accepted. First slice only: local `small-music` worker → WAV → existing `uploadQueue`. One Generate action on **+**. Not a chrome kingdom. Not auto-placed on My VYBZ. Labeled generated. Powered by Stability AI. No session provenance. No Stability API. Large is refused.

`GENERATE_AUDIO` is locked. Gate `generateAudio` is registered. Worker is `npm run generate:worker` (loopback `127.0.0.1:48481`). Clone stays sibling (`Documents/stable-audio-3`); not vendored. First real generate needs `uv sync` in that clone and a Hugging Face download — **not run**. Worker-down UI: **Not measured** in a signed-in production walk. Local generate of a WAV: **Not measured**.

`npm run lint` pass. `npm run test` pass — **198 files / 1001 tests**. `npm run build` pass. `npm run check:no-fixtures` against `dist/` — 13 markers absent. Signed-in + → Generate walk: **Not measured**.

## Living Profile Phase 7 — Hide existing sections — 2026-08-25

Narrow first slice after Arrange. Owner **Hide** / **Show** of modules that already exist. Hidden sections omit on the public VYBZ and in visitor preview even when they have content. Arrange still lists them. Stored on `profiles.profile` jsonb as `stageHiddenModules`. Identity banner, sticky chrome, and Book a session stay fixed. No rename, no invent, no theme engine, no CSS/JS injection.

`LIVING_PROFILE.profileSectionHide` is true. Production walk of Hide: **Pass** (PR #210 smoke test).

`npm run lint` pass. `npm run test` pass — **195 files / 986 tests**. `npm run build` pass.

## Book a session — genuine visitor walk — 2026-08-25

Signed in as **~Love** on https://vybz.cloud. Did not use owner visitor-preview as the booking path. ~Love was not modified. No new DM body was sent.

- **Their VYBZ:** `/u/9e45224c-f5f0-4af1-960c-8f9b178a4933` (~Andrew). Visitor chrome: Connect, Follow, Message, Tip Vc. **Book a session** present. **Message to book** opened the existing DM popout. Composer stayed empty.
- **Own visitor preview:** **Book a session** absent. Connect / Follow / Message / Tip absent. Featured and Works unchanged.

## Living Profile Phase 6 — Modular arrangement — 2026-08-23

Narrow first slice. Owner **Arrange** of modules that already exist on the Stage File. Order stored on `profiles.profile` jsonb as `stageModuleOrder`. Featured is its own module when a work is placed or pinned there. Empty modules omit; Arrange still shows them. Identity banner, sticky chrome, and Book a session stay fixed. No theme engine, no CSS/JS injection, no cinematic canvas.

`LIVING_PROFILE.profileModularArrangement` is true. Merged to `main` as PR 206 (`3d22afe4`; feature `b3a7f016`). Phase 6 is **accepted**. No rollback.

Signed-in walk 2026-08-23 as **~Love** on https://vybz.cloud. Refreshed before Arrange. Did not Hide, Place, or unpin. No account, DNS, or schema changes. Original visible order restored after each test: Featured (`locked in new 2`) → Works (`locked in next 1`) → Measured → Credits → More.

- **Keyboard:** Arrange present. Empty Stage / Story / Packs appear only in Arrange. **Move Featured down** swapped Featured under Works. Persist disabled Done while saving, then re-enabled. Hard refresh kept `works`, `featured`, `measured`, `credits`, `links`. Featured still held `locked in new 2`; Works still held `locked in next 1`.
- **Visitor preview** (`?view=visitor`): same occupied order (empty Credits omitted). Viewing as a visitor / Back to owner. No Arrange / Library / Edit profile. Identity banner and Listen · 2 stayed outside the module list. Desktop and 390×844: identity above Listen, Works first. Same tracks in the same modules.
- **Pointer drag:** passed on production. Drag Works handle onto the Featured module (`dataTransfer` `vybz-stage-module:works`). Order became Works → Featured. Refresh persisted. Visitor preview matched. Featured still held `locked in new 2`; Works still held `locked in next 1`. Drag Featured onto Works restored Featured → Works. Refresh confirmed `featured`, `works`, `measured`, `credits`, `links`. First work card: `locked in new 2`.
- **Book a session** from a genuine separate visitor session: **Not measured** — follow-up, not passed. Owner visitor-preview does not show it (`visitorSocial` is false on your own identity). ~Love was not modified.

Pre-merge validation (not re-run for this docs record): `npm run lint` pass. `npm run test` pass — **195 files / 983 tests**. `npm run build` pass. `npm run check:no-fixtures` against `dist/` — 13 markers absent.

## Living Profile Phase 5 — Library → profile — 2026-08-22

Select existing Library work. **Place on your VYBZ.** Choose Works or Featured. Done. Ids only — no second catalog, no duplicate upload. Until the owner composes, the Stage File still shows catalog drops so existing public work does not vanish. After the first place or hide, new uploads stay off the Stage File until placed.

Library views: grid, list, table, and **shelves** (horizontal rows per group). View / sort / group are remembered per person. After composing, Library can filter **On my VYBZ** / **Not on VYBZ**.

`LIVING_PROFILE.libraryToProfilePipeline` is true. Merged to `main` as PR 204 (`f9f47e94`).

Signed-in walk 2026-08-22 as **~Love** on https://vybz.cloud (Build **79ce3ed**):

- Empty owner Stage File showed “Place work from Library when you want — it stays one file” plus **Open Library**. Empty Library (**Works (0)**) had no grid/list/table/shelves toolbar.
- **View as visitor** (`?view=visitor`) hid owner chrome; banner “Viewing as a visitor” / **Back to owner**; no Connect / Follow / Message / Tip on this identity.
- After two WAV uploads (`locked in next 1`, `locked in new 2`): Library **Works (2)**, **2 in library**. Views grid → list → table → shelves. Sort **Title A–Z**, group **Format**. Reload persisted `{view:"shelves", sort:"title-asc", group:"format"}`.
- Place `locked in next 1` on **Works** (starts composing; both current files snapshotted). Tiles **On VYBZ / Arrange**. Still **2 in library** (no copy). Arrange `locked in new 2` → **Featured** → Update. Filter **Not on VYBZ** showed zero tiles; **On my VYBZ** showed both.
- Visitor preview after compose: both works visible under **Works**; owner controls gone. Featured did **not** lead and had **no separate Featured section** — order was `locked in next 1` then `locked in new 2`. That ranking bug is the Phase 6 Stage File split.
- Post-compose new upload stays off Stage File: **Not measured** (file input cannot be automated in this browser).

`npm run lint` pass. `npm run test` pass — **194 files / 976 tests**. `npm run build` pass. (Phase 5 merge evidence; not re-run as Phase 6 proof.)


## Living Profile Phase 4 — Profile module registry — 2026-08-22

Stage File works go through `MODULE_RENDERERS` (kind → renderer). Audio, image, video, file (download), project, and link stay. Text covers notes and writing (`drop.body` without audio; project posts of kind `text`). Collection covers albums with two or more tracks (members are not also listed as singles) and connected playlists already stored on the profile. Unknown kinds fall back to `UnknownWork`. 3D and games are not registered. Library → profile is Phase 5.

`LIVING_PROFILE.profileModuleRegistry` is true. Signed-in browser walk of text/collection cards: **Not measured**. Merged to `main` as PR 202 (`3dbfc4f3`).

`npm run lint` pass. `npm run test` pass — **192 files / 964 tests**. `npm run build` pass.

## Living Profile Phase 3 — Owner / visitor dual mode — 2026-08-22

Merged to `main` as PR 201 (`43cd9d8f`). One Stage File. Two permission contexts. Owner sees Library, Workspace, Go live, Edit, and View as Visitor. Visitor sees the experience. Preview (`?view=visitor`) never runs Connect, Follow, Message, or Tip on your own identity. Frozen `MobileNav` stays unmounted. No Devices nav.

`LIVING_PROFILE.ownerVisitorDualMode` is true. Signed-in browser walk of View as Visitor: **Not measured**.

`npm run lint` pass. `npm run test` pass — **192 files / 959 tests**. `npm run build` pass.

## Living Profile Phase 2 — Quiet chrome — 2026-08-22

Merged to `main` as PR 200 (`51d5aa85`). Default chrome is **VYBZ · Search · + · Chat · Alerts · Me**. `PrimaryRail` stays in the tree. Signed-in browser walk: **Not measured**.

`npm run lint` pass. `npm run test` pass — **191 files / 954 tests**. `npm run build` pass.

## Living Profile Phase 1 — Home is My VYBZ — 2026-08-21

Merged to `main` as PR 199 (`3860e474`). Logged-in `/` renders the existing Stage File. Workspace at `/workspace`. `LIVING_PROFILE.loggedInHomeIsMyVybz` is true. Browser walk of signed-in `/`: **Not measured**.

`npm run lint` pass. `npm run test` pass — **191 files / 953 tests**. `npm run build` pass.

## Living Profile Phase 0 — Constitution lock — 2026-08-21

Identity lock only. Chrome is unchanged: signed-in home is still Workspace (`/`). Frozen `MobileNav` stays unmounted. No Devices nav.

`PRODUCT.md` is Version 9. Thesis: VYBZ is a living social identity that becomes a creative operating system when you create. Decision [`0011`](docs/decisions/0011-living-profile.md) records that. `LIVING_PROFILE` in `src/product/invariants.ts` is the identity lock. `CREATOR_OS.creatorOsIsTheProduct` is false. `CREATOR_OS.livingProfileBecomesCreatorOs` is true. Gate `livingProfile` is registered.

Locked especially: One Identity, One Library, Profile Is The Product, Community First, Refine Before Replace. Also: no forced creator onboarding, one profile / two perspectives, tools serve Work, private by default, quieter chrome as power grows.

Creator OS work already on `main` (`060af4f8`) stays: Asset Node, Follow without a public count, provenance as association, Stage File work kinds, Go Live screen-then-audio. Not deleted.

`npm run lint` pass. `npm run test` pass — **191 files / 953 tests**. `npm run build` pass.

## Creator OS Phase 9 — Hardening (first slice) — 2026-08-21

Not a completed audit of the directive list (WebRTC, chat abuse, media parsing: **Not measured**). First slice confines Asset Node paths (`safeRelativePath`, `fileAtRelativePath` refuses `..`), reuses existing CSP in `vercel.json`, keeps Follow without a public count, and keeps provenance as association. Additive CHECK `indexed_assets_relative_path_confined` applied on `xixmneooyufbeftdfpcm`.

Ableton Index a folder: still **unverified** in the browser.

`npm run lint` pass. `npm run test` pass — **190 files / 948 tests**. `npm run build`: **Not measured**.

## Creator OS Phase 8 — Mobile Asset Participation — 2026-08-21

Reuse the existing Asset Node. No Devices nav. No Capacitor document-picker plugin. When `showDirectoryPicker` exists, indexing stays a persisted folder (**Available now**). When it does not (typical phone / Safari), the Platform Bridge falls back to a file pick labeled **While this app is open**. Those blobs stay in the JS heap — they are not written to IndexedDB and are not a background host. After reload they settle to **Unavailable here**. Other-device cloud rows stay **On another device** (names and sizes only). Public media stays in Works. CHECK on `creator_nodes` / `indexed_assets` extended with `session-only` and `unavailable` on project `xixmneooyufbeftdfpcm`.

Library **This device** shows the six-state legend. Owner confirmed **Index a folder** on an Ableton Live 12 project: picker returns, catalog does not appear (2026-08-21). Follow-up: catalog walk is **name-only** (no `getFile` during index) and **This device** stays mounted while Library loads. Browser re-walk: **Not measured**.

`npm run lint` pass. `npm run test` pass — **188 files / 941 tests**. `npm run build` after name-only walk: **Not measured**.

## Creator OS Phase 7 — Social Creator Network — 2026-08-21

Reuse VYB (work reaction), Connect (request), Live discovery (`WhosLivePanel`), DMs, and Hub activity. Added unidirectional **Follow** (`creator_follows` on project `xixmneooyufbeftdfpcm`) with no public count. Network (`/feed`) now composes live, People/Messages links, Following stream, and activity. Connect is no longer labeled as follow. `drops.audience = followers` still means accepted connections — that visibility rule was not rewritten.

Owner confirmed Following works (2026-08-21). Public follower counts: still unpublished. Committed `5f21b62c`.

`npm run lint` pass. `npm run test` pass — **187 files / 937 tests**. `npm run build` pass.

## Creator OS Phase 6 — Creation Provenance MVP — 2026-08-21

Reuse sealed `provenance_sessions` / `.vprov`. No second ledger. Additive RPCs `associate_session_work` and `creation_session_links` applied on project `xixmneooyufbeftdfpcm`. A creator associates a stored Work (and optionally a Project) with a **sealed** live. SHA remains measured from `assets.sha256`; the Work/Project link is declared. Copy is locked to: **This file is associated with verified VYBZ creation sessions.** Never Human certified. Never a not-AI proof. Committed `00192a4b`.

Surfaces: Library **Validate Humanity** on an owned drop; Live **Session provenance** history of sealed nights; Stage File work cards show the claim when a public link exists.

Browser walk of Validate Humanity bind: **Not measured**. Public work-card claim on a live profile: **Not measured**.

`npm run lint` pass. `npm run test` pass — **185 files / 932 tests**. `npm run build` pass.

## Creator OS Phase 5 — Live Creation — 2026-08-21

Reuse LiveKit. No new SFU. No schema. Go Live now leads with **Screen** (window/display), then **Audio** (mic, persisted as `camera` + `ingest:audio` so the existing CHECK holds), then Camera / Both / VLink. Display publishes as LiveKit screen share. Audio-only uses speech mode and the existing `LiveVisualizer` on the watch stage. Identity, World/Circle, chat, Stage File, ATC, and `live_sessions` stay. Committed `9500c84e`.

Browser walk on `http://localhost:5173/live` (signed-in, 2026-08-21): Go Live heading **Go live**; source tabs **Screen → Audio → Camera → Both → VLink**. Screen/window picker: **Not measured**. Audio-only live as a signed-in host: **Not measured**. Viewer subscribe: **Not measured**.

`npm run lint` pass. `npm run test` pass — **184 files / 928 tests**. `npm run build` pass.

## Creator OS Phase 4 — Creator Profile 2.0 — 2026-08-21

`/u/:id` Stage File now leads with live nights, then **Works** via `collectStageWorks` + `WorkCard` renderers for audio, image, video, file, project, and link. Existing TrackCard, project posts, profile projects, and `musicUrl` feed the registry. App bar default is Creator, not Music/Artist. `ARTIST_STAGE_PROFILE.moreThanAudio` and `extensibleWorkRenderer` are locked. No new tables. No Devices nav. Frozen `MobileNav` stays unmounted.

Browser walk on `http://localhost:5173/u/9e45224c-f5f0-4af1-960c-8f9b178a4933` (signed-in, 2026-08-21): heading **Andrew**; eyebrows **On the stage**, **Works**, **Packs**, **Measured**; one work with `data-kind="audio"`. Image/video/file/project/link cards on this account: **not present in the measured catalog** (renderers exist; this profile currently has audio).

`npm run lint` pass. `npm run test` pass — **184 files / 924 tests**. `npm run build` pass.

## Creator OS Phase 3b E2E — signed-in metadata upsert — 2026-08-21

Measured on `http://localhost:5173` as signed-in Andrew (`9e45224c-…`). Used the SPA session JWT + anon key against `creator_nodes` / `indexed_assets` (same RLS path the Library client uses). Probe node `vybz-e2e-probe` (`9d352157-…`): POST node **201**, POST asset **201**. RLS GET returned `name=vybz-e2e-probe`, `availability=local-only`, `file_count=1`, `total_bytes=12`, asset `probe.txt` / `text/plain` / 12 bytes. Payload had **no `url`**, **no `local_path`**. Library **This device** then showed `vybz-e2e-probe` / **DEVICE OFFLINE** / `probe.txt`. Signed-in DELETE asset **200**, node **200**; remaining GET `[]`. `storage.objects` in `audio-assets` created in the prior 15 minutes: **0**. Probe rows were removed after the walk.

Folder pick in Chromium: **Not measured**. Native Tauri folder dialog: **Not measured**. The Index-a-folder button was not the write path for this measurement.

## Creator OS Phase 3b — cloud metadata plane — 2026-08-21

Owner authorized cloud tables. Applied additive migration `creator_asset_nodes` on project `xixmneooyufbeftdfpcm` (vybz). Tables `creator_nodes` and `indexed_assets` exist with owner-only RLS. No `url` column. No `local_path`. `assets.url` remains NOT NULL. Library **This device** now upserts metadata after a local index and shows nodes from other devices as **Device offline**. Bytes are not uploaded.

Folder pick in Chromium: **Not measured**. End-to-end cloud upsert as a signed-in user: **Not measured**.

`npm run lint` pass. `npm run test` pass — **183 files / 921 tests**. `npm run build` pass.

## Creator OS Phase 3 — local Asset Node — 2026-08-21


Library gained **This device**. A creator can authorize a folder through the Platform Bridge (`showDirectoryPicker` on web; desktop/mobile fall back to that instead of throwing). VYBZ stores names, sizes, and paths in IndexedDB on this machine. Bytes stay on disk. Indexing is not publishing. Availability is **Local only** (or **Device offline** if the handle is gone). Unindex does not delete files. No Devices nav. No cloud tables. No new vendors. No production migration — cloud metadata (`creator_nodes` / `indexed_assets`) stays unapplied until the owner authorizes it.

Gate `assetNode` is registered. Folder pick in Chromium: **Not measured**. Native Tauri folder dialog: **Not measured**.

`npm run lint` pass. `npm run test` pass — **183 files / 919 tests**. `npm run build` pass.

## Creator OS Phase 2 — shell chrome — 2026-08-21

Visible pivot on existing VYBZ chrome. Default rail is Workspace (`/`), Library, Network (`/feed`), Live. Group labels are Work and Network. App bar, command palette, welcome tour, and Library/Network copy follow. Frozen `MobileNav` stub stays unmounted. No schema. No vendors. Parked swipe/chrome WIP remains in stash `park/mobile-chrome-swipe-phase2`.

`npm run lint` pass. `npm run test` pass — **181 files / 910 tests**. `npm run build` pass. Browser walk on `http://localhost:5173` (signed-in, 2026-08-21): rail **Workspace / Library / Network / Live**; `/` heading **Your work** with eyebrow Workspace; `/library` chip **Works (1)** and search “Search title, collection, creator…”; `/feed` heading **New work** with Network options; `/live` heading **Who's live** and “Creators on stage right now.” Vercel Ready: **Not measured**.

## Creator OS Phase 1 — product authority — 2026-08-21

Owner authorized the Creator OS pivot. Phase 0 was forensic (no product rewrite). This commit is Phase 1 only: one current product definition.

`PRODUCT.md` is Version 8. VYBZ is the Creator Operating System. Creative Work is the unit. Live, ATC, Stage File, tools, and market remain capabilities. Decision [`0010`](docs/decisions/0010-creator-os.md) records that. `CREATOR_OS` in `src/product/invariants.ts` is the identity lock. `LIVE_AUDIO.liveAudioIsACapability` replaces `liveAudioIsTheProduct`. Gate `creatorOs` is registered. The 2026-08-11 song/release brief is marked superseded.

No schema. No vendors. No shell chrome change beyond a `navModel` comment. Unrelated mobile swipe/chrome WIP was stashed as `wip-mobile-chrome-swipe` and is not in this commit.

`npm run lint` pass. `npm run test` pass — **181 files / 909 tests**. `npm run build` pass. Browser walk: **Not measured**. Vercel Ready: **Not measured**.

## VLink VST3 — 2026-08-18

Owner asked for a VST3 named **VLink** that syncs DAW audio and data as a local API node. Source is `native/vlink`. `build.bat` produced `VLink.vst3` and `VLinkNode.exe` on this machine with MSVC 14.44 (binaries are gitignored). The plug-in is a stereo thru insert. Loopback `127.0.0.1:48480` serves `/vybz-stream` (existing VYBZ PCM + hello/meter/transport) and `/vlink` plus HTTP `/v1/info|transport|meters`.

What is measured: process-buffer audio, peak/RMS, sample-peak dBFS, and ProcessContext transport **when the host sets the valid flags**. Tempo/time-sig omitted when the host does not provide them. VLink does **not** enumerate tracks, clips, or other plug-ins. LUFS on the wire is mean-square → LUFS-like, not BS.1770-4.

Web client accepts optional `pluginName` and `transport` messages. Go Live source tab is labeled VLink. Delivery of a compiled module in a DAW: **NATIVE-PLATFORM ONLY**. Loaded in Ableton/FL/Reaper this session: **Not measured**.

Loopback probe against `VLinkNode.exe` on `ws://127.0.0.1:48480/vybz-stream` (same URL as `DEFAULT_DAW_WS_URL`): hello + status + framed PCM + meter + pong + `GET /v1/info` all succeeded. Ping/telemetry from the existing client did not drop the socket.

`npm run lint` pass. `npm run test` pass — **180 files / 906 tests**. `npm run build` pass. `npm run check:no-fixtures` pass.

Pushed `continue-next` `b190234d`. Merged `--no-ff` to `main` `9c4de24d`. Pushed `origin/main`. Vercel Ready: **Not measured**. Loaded in a DAW: **Not measured**.

Vite `server.watch` now ignores `native/**`. Watching `native/vlink/build/*.obj` crashed `npm run dev` with EBUSY (measured twice). Pushed `12da6464`. Merged `--no-ff` to `main` `82d61df6`.

## Home is the owner's library — 2026-08-18

Owner asked to take the failed Spotify/SoundCloud home off the stage. `/` now shows only the signed-in user's library (`UploadsLibrary`, paged to the measured total). Other people are not on Home. Find them from the People menu in the app bar (`searchCreators` → `/u/:id`) or More → People (`/connect`). Live, feed, alerts, Go Live, and Studio stay in the tree and stay reachable; they are hidden from the Home view, not deleted.

`npm run lint` pass. `npm run test` pass — **180 files / 904 tests**. `npm run build` pass. `npm run check:no-fixtures` pass.

Pushed `continue-next` `8b07f84c`. Merged `--no-ff` to `main` `f6e3ad5f`. Pushed `origin/main`. Browser walk: **Not measured**. Vercel Ready: **Not measured**.

## Spotify + SoundCloud homepage — 2026-08-18

`/` (ArtistHome) is now a listen home: time-of-day greeting, All / Live / Uploads / Library chips, a wide Who's live shelf, Spotify-style episode cards for newest public uploads, a SoundCloud waveform stream, then your recent, library, notifications, and Studio below the fold. Profile bio / badges left the hero (they stay on the profile tab). Gate markers stay: `ops-home`, `hub-go-live`, `HubActivity`, `WallAlerts`, `WhosLivePanel`, `buildStats`. Not a 3-panel. Nothing deleted.

`npm run lint` pass on the final source. `npm run test` pass — **180 files / 904 tests**. `npm run build` pass. `npm run check:no-fixtures` pass. Homepage gate files re-run after the HubActivity move: pass.

Pushed `continue-next` `73fb3c30`. Merged `--no-ff` to `main` `ce7d96b1`. Pushed `origin/main`. Browser walk: **Not measured**. Vercel Ready: **Not measured**.

## Feed, live stage, and profile polish — 2026-08-18

Feed is in the rail and leads with newest public uploads (SoundCloud-style rows). Public compose lands on `/feed` and already writes the same drop the profile reads. + uploads one track; album/batch left the plus menu. Live watch fills the stage and no longer paints a reactive overlay on the video. Profile hero is shorter; uploads lead; roster/affiliates sit under More.

`npm run lint` pass. `npm run test` pass — **180 files / 904 tests**. `npm run build` pass. `npm run check:no-fixtures` pass.

Pushed `continue-next` `2d8be2a5`. Merged `--no-ff` to `main` `5caefea8`. Pushed `origin/main`. Browser walk: **Not measured**.

## Library copy and settings gear — 2026-08-18

Library no longer shows "Your files", "Drop audio anywhere to add it.", or "Selling packs? Your packs". The Stages chip and the stage-backdrop filter toggle are hidden from the library filters. The far-right app-bar control is a gear, not the avatar. StagesLibrary stays in the file.

`npm run lint` pass. `npm run test` pass — **180 files / 904 tests**. `npm run build` pass. `npm run check:no-fixtures` pass. Browser walk: **Not measured**.

## Rail identity and darker dock — 2026-08-18

Left rail labels (VYBZ / Music ops / Live mix) are gone. The head is avatar, name, handle, and a notifications popover. VDock film is dimmer so transport reads. Stage sits flush to the rail (no centered max-width gap). Now-playing title and artist are larger, with a sheen and drift while playing.

`npm run lint` pass. `npm run test` pass — **180 files / 904 tests**. `npm run build` pass. `npm run check:no-fixtures` pass.

Pushed `continue-next` `e816cff8`. Merged `--no-ff` to `main` `36519f1c`. Pushed `origin/main`. Browser walk: **Not measured**.

## Vizualz in the dock and backdrop — 2026-08-18

Dock visualizer plays the Vizualz catalog as muted loops under the meter. The options panel lists the films plus bars / mirror / wave / pulse. The page backdrop uses a faded Ember Drift loop that follows the pointer and the measured audio bands. Reduce-motion keeps the still. The dry play element is untouched.

`npm run lint` pass. `npm run test` pass — **180 files / 904 tests**. `npm run build` pass. `npm run check:no-fixtures` pass.

Browser walk: **Not measured**. Loops are not committed; production needs the `site-visuals` CDN. Local `npm run dev` reads `public/vdock/visuals`.

## Signed-in Home is the landing — 2026-08-18

Owner asked to hide Living Mix, Make pack, Sales, Rooms, and Packages from public chrome, and to put library / dashboard / profile / stats on one landing with notifications, live alerts, and Go Live.

Hidden from the rail, account menu, and tools launcher. Routes still resolve. Not deleted.

`/` is now the signed-in landing: profile, Go Live, must-ack alerts, Who's live, notifications, measured stats, library. After key / tour / redeem, the app lands on `/`.

`npm run lint` pass. `npm run test` pass — **179 files / 902 tests**. `npm run build` pass. `npm run check:no-fixtures` pass.

Browser walk of the landing: **Not measured** — no browser tool this session. Not on production until merged.

## Park Airtime Credits — 2026-08-18

Owner asked to put ATC off for now. Not deleted. `FLAGS.atc` is opt-in (`VITE_FEATURE_ATC=on`). Default is off.

When off: header clock hidden, go-live skip the 300 ATC gate, host burn and listen earn do not run, earn copy stays out of `/live` and Who's live. Ledger, RPCs, migrations, and UI files stay in the tree. Admin Airtime tab stays. Set `VITE_FEATURE_ATC=on` to restore.

`npm run lint` pass. `npm run test` pass — **179 files / 902 tests**. `npm run build` pass. `npm run check:no-fixtures` pass.

Pushed `continue-next` `eaa541a7`. Merged `--no-ff` to `main` `1bfbc43a`. Pushed `origin/main`. Browser walk of the parked path: **Not measured** — no browser tool this session.

## Revert 3-panel homepage — 2026-08-18

Owner rejected the 3-panel addition. Reverted `c23b3efe`. `/live` is the prior Who's live page. Suite rail, tools launcher, and `/` hub are back. Fusion files existed only in that commit.

`npm run lint` pass. `npm run test` pass — **179 files / 902 tests**. `npm run build` pass. `npm run check:no-fixtures` pass.

## Daily clock is 2h, not 3h — 2026-08-18

Owner quoted **daily 2h 0m**. Daily free is still 7200 ATC. The header and Go Live card now lead with that daily clock (`2h`, no leftover `0m`). The 1h starter stays under **earned**. Hosting still burns daily first, then earned. Amounts unchanged.

`npm run lint` pass. `npm run test` pass — **179 files / 902 tests**. `npm run build` pass. `npm run check:no-fixtures` pass.

## ATC clock shows 3h on a new account — 2026-08-18

Owner saw **3h 0m** after signup. That is the declared sum, not a new grant:

| Bucket | Declared | Clock |
|---|---|---|
| Daily free | 7200 ATC | 2h |
| New-user bootstrap (once, ≤7 days) | 3600 ATC | 1h |
| Header total | 10800 ATC | 3h |

Display now omits zero units (`3h` not `3h 0m`) and the header split reads daily · earned. Amounts unchanged.

`npm run lint` pass. `npm run test` pass — **179 files / 902 tests**. `npm run build` pass. `npm run check:no-fixtures` pass.

## alpha-key v2 deployed — 2026-08-18

`npx supabase functions deploy alpha-key --project-ref xixmneooyufbeftdfpcm --no-verify-jwt` succeeded. Dashboard list: **ACTIVE**, **version 2**, updated **2026-08-18 12:41:11 UTC**.

Live smoke against `https://xixmneooyufbeftdfpcm.supabase.co/functions/v1/alpha-key` (anon, no session):

| Call | Measured |
|---|---|
| `POST` `{ "email": "nope" }` | **400** `{"error":"invalid_email"}` |
| `GET` | **405** `{"error":"method_not_allowed"}` |
| New-address createUser + tokenHash | **Not measured** — would mint a production account |

No new auth user was created. Reception / referral still refused. SessionToolDrawer unchanged.

## Listen-to-earn discovery — 2026-08-18

Who's live states listening is free and staying earns Airtime. The watch stage shows measured ATC credited this stay (`useListenEarn`). No new mint rates.

| Piece | State | Evidence |
|---|---|---|
| Discovery copy | **IMPLEMENTED BUT NOT DELIVERED** | `listen-earn-hint` on `WhosLivePanel` |
| In-session meter | **IMPLEMENTED BUT NOT DELIVERED** | `listen-earn-meter` on `LiveWatchPage` from `listenCredited` |
| GitHub | Merged | PR #195 · `main` `62ea2a84` |
| Browser walk | Not measured | No web browser tool this session |

## Who's live panel — 2026-08-18

Once inside, the first live surface is a **Who's live** panel of current hosts (name, handle, role/title, watchers). Same panel on `/live`, the hub, and the profile live tab. Empty reads "No one is live." Go live stays in the app bar.

| Piece | State | Evidence |
|---|---|---|
| Who's live | **IMPLEMENTED BUT NOT DELIVERED** | `WhosLivePanel` on `LivePage`, `ArtistHome`, `DashLivePanel`. Reads `listLiveSessions` |
| Browser walk | Not measured | No web browser tool this session |

`npm run lint` pass. `npm run test` pass — **179 files / 902 tests**. `npm run build` pass. `npm run check:no-fixtures` pass.

## Key → account → Who's on — 2026-08-18

Self-serve key now starts the account. The key stays bound to the email. A typo is unrecoverable because the address is not verified. Login is passkey or password only. New people go back to the key form. After the name is claimed, the tour asks for a passkey or password. First room is Live / Who's on.

| Piece | State | Evidence |
|---|---|---|
| Auto-signup on key | **IMPLEMENTED BUT NOT DELIVERED** | `claimAlphaAccess` + `alpha-key` createUser / generateLink. Existing emails are not auto-signed-in |
| Login-only `/enter` | **IMPLEMENTED BUT NOT DELIVERED** | `Onboarding` has passkey + password. No signup. "No account? Go back" |
| Security in tutorial | **IMPLEMENTED BUT NOT DELIVERED** | `ALPHA_GUIDE_STEPS` security after username. `registerPasskey` or `setAccountPassword` required |
| Land on Who's on | **IMPLEMENTED BUT NOT DELIVERED** | After claim / redeem / tour → `/live` |
| `alpha-key` edge deploy | **DEPLOYED** | version 2 ACTIVE · 2026-08-18 12:41:11 UTC. Invalid email 400 measured |
| Browser walk | Not measured | No web browser tool this session |

`npm run lint` pass. `npm run test` pass — **178 files / 901 tests**. `npm run build` pass. `npm run check:no-fixtures` pass.

## Live UI + Stripe tips on stage — 2026-08-18

`main` **`8216efcd`** merges continue-next **`07a146ce`**. Prior merge **`61d9661a`** took the nine conflicted files from continue-next (`--theirs` on main). Pack Maker stayed in the tree.

Go Live is the `/live` front door for any host. Stripe `TipButton` / `startTip` is on the watch stage and host profile. V¢ tip stays. No second wallet. No ATC writes. If payouts are off, the Stripe button does not render.

| Piece | State | Evidence |
|---|---|---|
| Live front door | **IMPLEMENTED BUT NOT DELIVERED** | `LivePage` any-host copy; rail `HOME_ITEM` is Live → `/live`; Go Live purpose chips Mix / Talk / Podcast / Vent |
| Stripe tips on stage | **IMPLEMENTED BUT NOT DELIVERED** | `TipButton` on `LiveWatchPage` + `ArtistStageProfile`. Hides unless `FLAGS.tips` and `creatorTipsEnabled`. Uses `startTip` → `stripe-tip` |
| Host profile copy | **IMPLEMENTED BUT NOT DELIVERED** | Stage File says host / live nights, not artist-only mixes |
| SessionToolDrawer / 0008 | Unchanged | Drawer not edited. Reception / referral still refused |
| Browser walk | Not measured | No web browser tool this session. Web app not deployed |

`npm run lint` pass. `npm run test` pass — **178 files / 900 tests**. `npm run build` pass. `npm run check:no-fixtures` pass.

## Owner walk — new account live >45 min — 2026-08-18

Owner-reported against local `npm run dev` (http://localhost:5173), code HEAD **`9b6baa7b`** (PRODUCT v7 lock). New account. Stayed live **over 45 minutes**. Owner: all seemed working.

That is a signed-in walk of go-live + host stay. It is **not** a production walk. Bootstrap grant, leftover-seconds end, `.vprov` download, and Stage File were **not separately reported**.

Web app **not deployed**. Reception / referral still refused.

## Product lock v7 — live audio for any host — 2026-08-18

Slices 2, 3, and 1 were verified in the tree at **`0c04d717`** (not fiction):

| Slice | Evidence in tree |
|---|---|
| 2 Go-live gate | `AtcHostCard` on `GoLiveSheet` + `LiveWatchPage`. Start uses `canStartHost`. Leftover buffer in `useHostBurn` |
| 3 Provenance package | `SessionProvenanceReport` + `downloadVprovPackage`. Copy is Session provenance, never Human certified |
| 1 Bootstrap | `grant_bootstrap_atc` 3600 / 7 days in 0110. Reception/referral still `rates_not_measured` |

This commit locks **PRODUCT.md Version 7** and decision [`0009`](docs/decisions/0009-live-audio-for-any-host.md). No new features. No new mints. No schema churn. SessionToolDrawer, Airtime Phase 1, and 0008 were not reopened.

**Shipped (code, not delivered):** live rooms, ATC clock, go-live card, leftover end, `.vprov` + in-app report, bootstrap 3600/7d, host Stage File.

**Refused:** reception bonus, referral, buying ATC, paying to listen, paying for rank, ticketed events (out of this lock), “Human certified,” not-AI proof.

**Not measured:** signed-in browser walk. Web app not deployed.

`npm run lint` pass. `npm run test` pass — **177 files / 897 tests**. `npm run build` pass. `npm run check:no-fixtures` pass.

## Slice 1 — new-user bootstrap — 2026-08-18

**0110 applied** to `xixmneooyufbeftdfpcm`. `grant_bootstrap_atc` credits **3600** earned ATC once if the profile is ≤ 7 days old. `get_airtime_balance` calls it after the daily grant. Reception bonus and referral still return `rates_not_measured`. Stripe cannot mint ATC.

| Piece | State | Evidence |
|---|---|---|
| Bootstrap mint | **IMPLEMENTED BUT NOT DELIVERED** | 0110 + `mayGrantBootstrap` |
| Reception / referral | Refused | 0008 / 0109 unchanged |
| Browser walk | Not measured | Web app not deployed |

`npm run lint` pass. `npm run test` pass — **176 files / 894 tests**. `npm run build` pass. `npm run check:no-fixtures` pass.

## Slice 3 — session provenance report — 2026-08-18

Ended host sessions show an in-app verification report and a `.vprov` download. Copy is **Session provenance**, never “Human certified.” Not-AI stays **Not measured**. Full strength still requires measured ATC burn. No new economy rules. SessionToolDrawer was not edited.

| Piece | State | Evidence |
|---|---|---|
| In-app report | **IMPLEMENTED BUT NOT DELIVERED** | `SessionProvenanceReport` on ended host `LiveWatchPage` |
| `.vprov` zip | **IMPLEMENTED BUT NOT DELIVERED** | Existing package + report download |
| Reception / referral | Refused | Unchanged |

`npm run lint` pass. `npm run test` pass — **176 files / 892 tests**. `npm run build` pass. `npm run check:no-fixtures` pass.

## Slice 2 — go-live Airtime gate — 2026-08-18

Host-facing Airtime card on Go Live and the live stage. Daily free and earned are shown separately. Start stays blocked below 300 ATC. Burn starts on go-live. A leftover shorter than 30s is played out, then the session ends — no hard cut. Reception / referral stay refused. Stripe still cannot mint ATC.

| Piece | State | Evidence |
|---|---|---|
| Start gate UI | **IMPLEMENTED BUT NOT DELIVERED** | `AtcHostCard` on `GoLiveSheet`. Go disabled when `canStartHost` is false |
| In-session meter | **IMPLEMENTED BUT NOT DELIVERED** | Host card on `LiveWatchPage` + leftover buffer in `useHostBurn` |
| Reception / referral | Refused | 0008 / 0109 unchanged |
| Browser walk | Not measured | No web browser tool this session. Web app not deployed |

`npm run lint` pass. `npm run test` pass — **176 files / 892 tests**. `npm run build` pass. `npm run check:no-fixtures` pass.

## HEAD f9a6b6e5 is green — 2026-08-18

HEAD `f9a6b6e5` is green — lint, tests, and production build passed. SessionToolDrawer Package import is closed.

## ATC Phase 5 lock — reception / referral do not mint — 2026-08-18

Live-mix + ATC + provenance + Stage File vision is already written (`PRODUCT.md` v6, 0004–0007). **Airtime Phase 1 ledger is already applied (0105).** This slice does not rebuild it.

Decision [`0008`](docs/decisions/0008-atc-unmeasured-mints.md). Reception bonus and referral stay as ledger types. Their mint amounts are **Not measured**. Server RPCs return `rates_not_measured` and insert nothing. Daily grant / listen earn / host consume / Stripe / LiveKit / Living Mix unchanged.

| Piece | State | Evidence |
|---|---|---|
| Docs / invariants | **IMPLEMENTED BUT NOT DELIVERED** | 0008, `ATC_UNMEASURED_MINTS`, `refuseUnmeasuredMint` |
| Refuse RPCs | **INFRASTRUCTURE ONLY** | 0109 `award_reception_bonus` / `award_referral` |
| Bootstrap mint | Not started | Amounts already declared (3600 / 7d). Not this slice |
| Browser walk | Not measured | No web browser tool this session |

`npm run lint` pass. `npm run test` pass — **175 files / 890 tests**. `npm run build` pass. `npm run check:no-fixtures` pass.

**Next:** New-user bootstrap mint (declared 3600 / 7d) if wanted. Reception/referral stay refused until amounts are declared. Deploy + signed-in walk.

## Session provenance Phase 6 — stored-bytes SHA + C2PA ledger count — 2026-08-18

Host can bind one owned catalog asset to a sealed session. `assets.sha256` is **measured**. The claim that the file is the live mix is **declared**. C2PA is a **ledger event count**; the file C2PA box is **Not measured**. The C2PA worker is not invoked and not replaced.

**0108 applied** to `xixmneooyufbeftdfpcm` via `npx supabase db query --linked -f supabase/migrations/20260818_0108_session_stored_audio.sql`. Verified RPCs: `bind_session_stored_audio`, `session_stored_audio`.

| Piece | State | Evidence |
|---|---|---|
| Stored SHA bind | **IMPLEMENTED BUT NOT DELIVERED** | 0108 + `StoredRecapBind` on ended host session |
| C2PA | **PARTIALLY IMPLEMENTED** | Ledger count only. Worker untouched |
| Event chain | Unchanged | Bind writes `provenance_sessions.manifest` after seal |
| Reception bonus / referral | Not started | Still must not invent mint rates |
| Browser walk | Not measured | No web browser tool this session. Web app not deployed |

`npm run lint` pass. `npm run test` pass — **174 files / 887 tests**. `npm run build` pass. `npm run check:no-fixtures` pass.

**Next:** ATC reception bonus / referral only after locked rates. Deploy + signed-in walk of Stage File, ATC meter, `.vprov` download, and stored recap bind.

## Session provenance Phase 5 — audio SHA bind — 2026-08-18

A `.vprov` package now carries an audio SHA field. A digest of host-decoded DAW PCM is **declared**. A measured SHA still requires stored bytes (none are bound yet). Missing reads **Not measured**. C2PA is untouched. No new migration. ATC mint/burn formulas, Stripe, LiveKit, and Living Mix are unchanged.

| Piece | State | Evidence |
|---|---|---|
| Bind rules | **IMPLEMENTED BUT NOT DELIVERED** | `audioBind.ts` — client hex cannot become measured |
| DAW PCM hasher | **PARTIALLY IMPLEMENTED** | Incremental SHA-256 of decoded stereo PCM. Camera/display stays Not measured |
| Package field | **IMPLEMENTED BUT NOT DELIVERED** | `manifest.audioSha` + `verify.txt`. Web app not deployed |
| C2PA / stored-bytes SHA | Not started | Phase 6 |
| Reception bonus / referral | Not started | Still must not invent mint rates |
| Browser walk | Not measured | No web browser tool this session |

`npm run lint` pass. `npm run test` pass — **174 files / 884 tests**. `npm run build` pass. `npm run check:no-fixtures` pass.

**Next:** C2PA / stored-bytes SHA (Phase 6). ATC reception bonus / referral only after locked rates. Deploy + signed-in walk.

## Vision lock v6 + ATC Phase 4 meter — 2026-08-18

Authority now names the full stack: live mix + ATC + session provenance + artist/producer Stage File.

- `PRODUCT.md` **Version 6**. Decision [`0007`](docs/decisions/0007-artist-stage-file.md).
- `ARTIST_STAGE_PROFILE` + `LIVE_MIX_STREAMING.publicStageFile` + gate `artistStageProfile`.
- ATC Phase 1 ledger was already applied (0105). This slice is **Phase 4: header meter only**. It reads `get_airtime_balance`. It does not mint, burn, or change Stripe / LiveKit / Living Mix / auth.

| Piece | State | Evidence |
|---|---|---|
| Docs / invariants | **IMPLEMENTED BUT NOT DELIVERED** | PRODUCT v6, 0007, `ARTIST_STAGE_PROFILE` |
| ATC header meter | **IMPLEMENTED BUT NOT DELIVERED** | `AtcMeter` on `ContextualAppBar`. Failed fetch → **Not measured**. |
| Reception bonus / referral | Not started | Phase 5. Still must not invent mint formulas. |
| Provenance audio SHA / C2PA bind | Not started | Phase 5–6. |
| Browser walk | Not measured | No web browser tool this session. Web app not deployed. |

`npm run lint` pass. `npm run test` pass — **171 files / 874 tests**. `npm run build` pass. `npm run check:no-fixtures` pass.

**Next:** ATC reception bonus / referral only after a closed-loop spec that does not invent rates. Or provenance Phase 5 (audio SHA bind). Deploy + signed-in walk of `/u/:id` and the header clock.

## Artist Stage File profile — 2026-08-18

Public `/u/:id` is now the Stage File: cinematic hero, live nights first, measured stats only, Session provenance seal (never “Human certified”). Connect is still a request. Book-a-session opens a DM and says it is not a calendar. Existing `/u/:id` route kept.

**0107 applied** to `xixmneooyufbeftdfpcm` via `npx supabase db query --linked -f supabase/migrations/20260818_0107_host_stage_nights.sql`. Verified `list_host_stage_nights(p_host uuid, p_limit integer)`. Security-definer; world/public sessions plus sealed strength / ATC burned only; no event payloads.

| Piece | State | Evidence |
|---|---|---|
| Stage File UI | **IMPLEMENTED BUT NOT DELIVERED** | `ArtistStageProfile` + `UserProfilePage` loader. Web app not deployed. |
| Public nights RPC | **INFRASTRUCTURE ONLY** | 0107 applied. Fallback `live_sessions` select if RPC fails (no seal flags). |
| Browser walk | Not measured | No web browser tool in this session. |

`npm run lint` pass. `npm run test` pass — **171 files / 870 tests**. `npm run build` pass. `npm run check:no-fixtures` pass.

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
| Native VST3 / CLAP / AU plug-in | **NATIVE-PLATFORM ONLY** | VLink source in `native/vlink`. Compiled bundle produced locally; not in git. Client talks to `ws://127.0.0.1:48480/vybz-stream`. Loaded in a DAW: **Not measured**. |
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
