# VYBZ Desktop (Tauri 2) — Phase 1.5 PoC

Windows-first workstation shell around the shared Vite/React build.

## Status

| Item | State |
|------|--------|
| Scaffold | Present (`src-tauri/`) |
| Shared UI | Loads `../../dist` (run `npm run build:web` first) |
| Native command | `vybz_ping` → `"pong"` |
| Platform Bridge | `createDesktopBridge()` in `src/platform/bridge/desktop.ts` |
| Code signing | Not in Phase 1.5 |

## Prerequisites

1. [Rust](https://rustup.rs) (stable)
2. [Tauri 2 Windows prerequisites](https://v2.tauri.app/start/prerequisites/) (WebView2, MSVC build tools)
3. Node 20+

## Run PoC

```bash
# from repo root
npm run build:web
cd apps/desktop
npm install
npm run tauri:dev
```

Or from root (exits 0 with install guidance if Rust missing):

```bash
npm run dev:desktop
```

## Architecture note

Desktop remains an **untrusted client**. Native commands are allowlisted in
`src-tauri/capabilities/default.json`. Domain code must not import Tauri —
only Platform Bridge adapters may invoke native APIs.
