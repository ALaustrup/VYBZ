# VYBZ Desktop (Tauri 2) — Windows alpha (Phase 5 / 2.D)

Windows-first workstation shell around the shared Vite/React build.

## Status

| Item | State |
|------|--------|
| Scaffold | Present (`src-tauri/`) |
| Shared UI | Loads `../../dist` |
| Native commands | `vybz_ping`, `vybz_analyze_audio`, window prefs, secure store |
| Batch UI | `/desktop/process` |
| NSIS | `installMode: both` (GUI + passive-capable) |
| Updater channels | Configured in `updater/channels.json` (runtime plugin deferred until signed) |
| Code signing | Unsigned alpha — see `signing/README.md` |
| Crash | Local `crash.log`; no external send by default |

## Prerequisites

1. [Rust](https://rustup.rs) (stable)
2. [Tauri 2 Windows prerequisites](https://v2.tauri.app/start/prerequisites/) (WebView2, MSVC)
3. Node 20+

## Run

```bash
npm run build:web
cd apps/desktop && npm install && npm run tauri:dev
```

Or from root: `npm run dev:desktop`

## Release

See [`docs/operations/DESKTOP_RELEASE.md`](../../docs/operations/DESKTOP_RELEASE.md).

## Architecture

Desktop remains an **untrusted client**. Domain code must not import Tauri —
only Platform Bridge adapters may invoke native APIs.
