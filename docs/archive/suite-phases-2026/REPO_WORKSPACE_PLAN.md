> **HISTORICAL ONLY — NOT AUTHORITATIVE — DO NOT USE FOR CURRENT IMPLEMENTATION OR SEQUENCING.**
>
> Superseded on 2026-08-01 by the five authorities: `VYBZ_MASTERPLAN.md`, `AGENTS.md`,
> `ARCHITECTURE.md`, `STATUS.md`, `IDEAS_BACKLOG.md`. Retained as a historical record only.

# Repository workspace migration plan

> Staged path to `apps/*` + `packages/*` without a destructive rewrite.
> Authority: Master Blueprint §6.

## Verified today

- Single-root Vite SPA under `src/`
- Capacitor `android/` at repo root; `webDir: dist`
- No `apps/`, no `packages/`, no Tauri, npm (not pnpm)

## Package manager

**Keep npm.** Do not switch casually.

## Stages

| Stage | Action | Exit | Rollback |
|------:|--------|------|----------|
| A | In-tree `src/domain`, `src/platform/bridge` boundaries | Imports compile; no circular deps | Delete dirs |
| B | Optional npm workspaces + aliases without moving web | CI green | Revert workspace config |
| C | Extract UI package from `src/components/ui` | Consumers updated | Alias back to `src/` |
| D | Add `apps/desktop` Tauri consuming shared build | PoC boots | Remove desktop app |
| E | Relocate Capacitor under `apps/android` when scripts/CI ready | `cap sync` works | Keep root `android/` |
| F | Move web to `apps/web` | Full CI matrix green | Highest risk — last |

## Dependency direction

UI/app → domain → data/processing contracts → platform adapters.

## Rule

Do not move files merely to match a diagram. Extract when ownership is clear.
