> **HISTORICAL ONLY — NOT AUTHORITATIVE — DO NOT USE FOR CURRENT IMPLEMENTATION OR SEQUENCING.**
>
> Superseded on 2026-08-01 by the five authorities: `VYBZ_MASTERPLAN.md`, `AGENTS.md`,
> `ARCHITECTURE.md`, `STATUS.md`, `IDEAS_BACKLOG.md`. Retained as a historical record only.

# Phase 1.5 — Platform readiness inventory

Branch: `suite-genesis`. Living inventory for Platform Bridge + shell modes +
native PoC stubs.

## Contracts & aliases

| Alias | Path |
|-------|------|
| `@vybz/contracts` | `src/contracts/` |
| `@vybz/platform` | `src/platform/bridge/` |
| `@vybz/domain` | `src/domain/` (boundary marker) |

Vite / Vitest / `tsconfig` path aliases registered. No `apps/web` move (Stage F deferred).

## Platform Bridge

| File | Role |
|------|------|
| `src/platform/bridge/types.ts` | `PlatformBridge` contract |
| `src/platform/bridge/errors.ts` | Normalized `PlatformError` |
| `src/platform/bridge/capabilities.ts` | Runtime capability registry |
| `src/platform/bridge/web.ts` | Browser implementation |
| `src/platform/bridge/mock.ts` | Test implementation |
| `src/platform/bridge/desktop.ts` | Tauri desktop stub (+ web fallback) |
| `src/platform/bridge/android.ts` | Capacitor Android stub |
| `src/platform/bridge/tauriInvoke.ts` | Optional Tauri invoke shim |
| `src/platform/bridge/detect.ts` | Kind detection |
| `src/platform/bridge/createBridge.ts` | Factory |
| `src/platform/bridge/PlatformProvider.tsx` | React context |
| `src/platform/bridge/bridge.contract.test.ts` | Contract tests |

## Supporting platform modules

| Module | Path |
|--------|------|
| Network provider | `src/platform/network/` |
| Local cache contract | `src/platform/cache/` |
| Mutation queue | `src/platform/sync/` |
| Deep-link skeleton | `src/platform/deeplinks/` |

## Shell modes

- `src/shell/shellMode.ts` + tests
- `SuiteShell` sets `data-shell-mode` + `shell-mode-*` class
- CSS hooks in `src/index.css`

## Workspace scaffolding (no file moves)

- `packages/README.md` — future extraction map
- `apps/README.md` — shell homes
- `apps/desktop/` — Tauri 2 PoC scaffold
- Root scripts: `dev:web`, `dev:desktop`, `dev:android`, `build:*`, `test:shared`

## Native PoCs

| Client | Location | Notes |
|--------|----------|-------|
| Desktop | `apps/desktop/` | Scaffold + `vybz_ping`; Rust toolchain **not** installed on this machine → `dev:desktop` exits 0 with install guidance (documented blocker) |
| Android | root `android/` + `createAndroidBridge` | Reuses Capacitor seed; `sync:android` / `build:android:*` scripts |

## Bootstrap

`src/main.tsx` wraps app in `PlatformProvider`.
