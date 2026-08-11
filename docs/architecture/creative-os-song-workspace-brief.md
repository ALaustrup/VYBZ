# Creative OS — Song Workspace architecture brief

> **Reference, not law.** Owner review artifact (2026-08-11). Implementation requires
> AGENTS authorisation. Related: `IDEAS_BACKLOG.md` §8.4 OR-032–035.
>
> Interactive canvas: `creative-os-architecture-brief.canvas.tsx` (Cursor canvases).

## Mission

Turn VYBZ into **one creative operating system**, not a redesign for looks.

Center everything on the **song / release workspace**: shared working context,
**workstations** instead of isolated apps, and a simple **what next** home.
Preserve existing functionality; remap it into coherent desks.

## Visual language (feeling over layout)

Professional creative workstation — Ableton / DaVinci Resolve class — not a busy
admin website.

- One window, many workspaces
- Calm, minimal, information-dense
- Simple navigation; song or project is the hero
- Waveforms, artwork, subtle animation carry hierarchy
- Dark theme, clear icons, consistent panels
- Control room for a music career — no overwhelming dashboards

## One ecosystem, three doorways

| Experience | Job | Tone |
|---|---|---|
| **Desktop** | Studio — heavy workflows (Correct, Metadata, Analyzer depth, batch) | Full workstation |
| **Web** | Universal access — listen, organize, light edits, Market, prep | Browser-tailored, same data |
| **Mobile** | Capture & manage — listen, ideas, quick metadata, approvals | Not a downgrade |

**Rule:** Do not ask what platform it is. Ask what the user is trying to do.
Same workflow vocabulary; interface follows the job.

**Data:** One cloud database per user. Offline-first local cache; mutations queue
until reconnect. Platform Bridge remains the only native boundary.

## Diagnosis (today)

Suite rail looks like an OS; most desks still behave like separate websites.

| Pattern | Surfaces |
|---|---|
| Drop-primary islands | Analyzer, Correct, Translate, Metadata, Art Check, Midi, Converter, Pack Maker, Stem Maker |
| Library / API primary | Home, Library, Discover, Market browse, Codex |
| Session bridge | Analyzer → `pendingUpload` → publish |
| Shell playback | VDock / `audioBus` |

Library drops and Analyzer pending blobs exist, but Correct / Translate / Metadata /
Art Check ignore them and force re-upload.

## Proposed information architecture

### Hero: Song workspace

Active project = one release or track (or small set). Holds media refs, measured
findings, correction renders, metadata draft, artwork candidates, and **what next**
derived only from measured finding codes (Law 1).

**Intake order:** workspace media → Library picker → dropzone fallback.

### Workstations (map existing surfaces)

| Workstation | Maps from | Job |
|---|---|---|
| **Home · What next** | ArtistHome + guided next steps (OR-035) | Open song; measured next desks |
| **Prepare** | Analyzer + Correct + Travel listen + Metadata + Art Check | Finish master & assets |
| **Library** | Library + track detail | Canonical media |
| **Create** | Midi, Converter, Pack Maker, Stem Maker | Derivatives (optional) |
| **Publish** | Market, storefront, package / credits | Preview & sell / package |
| **Listen** | VDock (+ Discover, deepen parked) | Disclosed playback |

### Translate rename (OR-033)

Product is **travel listening** (streaming −14, phone/car, lossy) — not language
translation. Candidates: Travel · Listen as · Translation Lab (full name on rail).

## Non-negotiables

- Law 1 — no invented metrics / fake inventory
- Law 3 — no dating / swipe
- Law 5 — VDock contracts frozen (skin only)
- No DSP-delivery claims
- Domain never imports `@tauri-apps/*` / `@capacitor/*`
- Masterplan §9 is the only plan
- Live / messaging — bugfix / shared shell only until re-auth
- Hosting honesty — durable masters cost under VYBZ Pro §0; analysis stays free

## Suggested build sequence (approval required)

1. Approve this IA + workstation map
2. OR-032 — working-set context; preload Correct / Travel / Metadata
3. OR-033 — Travel rename on rail
4. OR-034 — Correct desk redesign on shared context
5. OR-035 — Home What-next from finding codes
6. Shell continuity (Wave R chrome as baseline)
7. Platform doorway tightening without forking the product
8. M10 Store commerce only if it does not fight the workspace model

## Owner review ask

Confirm or amend:

1. Song workspace as hero  
2. Workstation map above  
3. Travel rename preference  
4. First build wedge = **OR-032** working set  

**No implementation until AGENTS names the authorised track.**
