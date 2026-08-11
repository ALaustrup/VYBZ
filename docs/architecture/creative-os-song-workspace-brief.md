# Creative OS — Song Workspace architecture brief

> **Authorised source of truth** (owner confirmed **2026-08-11**). Implementation proceeds
> under `AGENTS.md` Creative OS track. Related: `IDEAS_BACKLOG.md` §8.4–§8.5.
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
- Suite chrome: large centered brand mark (no chip/outline); left wordmark reacts to V-Dock audio; no suite-app back arrow next to the logo

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

## Confirmed information architecture

### Hero: Song workspace

Active project = one release or track (or small set). Holds media refs, measured
findings, correction renders, metadata draft, artwork candidates, and **what next**
derived only from measured finding codes (Law 1).

**Intake order:** workspace media → Library picker → dropzone fallback.

Optional: link/drop an Ableton Live (or any DAW) project folder tied to a specific track
(follow-on wedge).

### Workstations (confirmed)

| Workstation | Maps from | Job |
|---|---|---|
| **Home · What next** | ArtistHome + guided next steps (OR-035) | Open song; measured next desks |
| **Prepare** | **Analyzer** (name only) + Correct + **Translation Lab** + Metadata + Art Check | Finish master & assets |
| **Library** | Library + track detail | Canonical media |
| **Create** | Midi Maker (+ sound preview / random), Converter (more formats), Pack Maker, Stem Maker | Derivatives |
| **Publish** | Store / Market — iTunes-style packs + music discovery feed | Browse, listen, publish |
| **Listen** | V-Dock (+ Discover, deepen parked) | Disclosed playback |

Landing (follow-on): drag-drop songs/files into VYBZ; each selected track opens its own
focused workspace with the active track at the top and tools revolving around it.

## Build sequence

1. Approve IA + workstation map — confirmed 2026-08-11
2. **OR-032** — working-set context; preload Correct / Translation Lab / Metadata (**active**)
3. **OR-033** — rail label **Translation Lab** (ships with OR-032 wedge)
4. OR-034 — Correct desk redesign on shared context
5. OR-035 — Home What-next from finding codes
6. OR-036+ — Midi preview/random · Converter formats · Pack←Library→Store · Market discovery · Landing drop · DAW folder · Analyzer reliability
7. Shell continuity (Wave R chrome as baseline)
8. Platform doorway tightening without forking the product

## Non-negotiables

- Law 1 — no invented metrics / fake inventory
- Law 3 — no dating / swipe
- Law 5 — VDock contracts frozen (skin / reactive chrome only)
- No DSP-delivery claims
- Domain never imports `@tauri-apps/*` / `@capacitor/*`
- Masterplan §9 is the only plan
- Live / messaging — bugfix / shared shell only until re-auth
- Hosting honesty — durable masters cost under VYBZ Pro §0; analysis stays free
