# Platform Bridge

> Typed capability boundary between shared VYBZ application code and
> platform-specific shells. Authority: [`VYBZ_MASTERPLAN.md`](../../VYBZ_MASTERPLAN.md) §8.

## Principle

Shared domain and feature code must not scatter:

```ts
if (isAndroid) { … } else if (isTauri) { … }
```

Instead inject a `PlatformBridge` implementation selected at app bootstrap.

## Contract

See Master Blueprint §8 for the canonical interface shape (`files`, `auth`,
`processing`, `notifications`, `system`, optional `sharing`).

## Implementations

| Kind | Status (blueprint expansion) | Target path |
|------|------------------------------|-------------|
| `web` | Phase 1.5 deliverable | `src/platform/bridge/web` → `packages/platform/web` |
| `desktop` | Phase 1.5 stub + Tauri PoC | `src/platform/bridge/desktop` |
| `android` | Phase 1.5 stub + Capacitor PoC | `src/platform/bridge/android` |
| `test` | Phase 1.5 deliverable | `src/platform/bridge/test` |

## Required behaviors

- Runtime capability detection (`getCapabilities` / feature flags on bridge)
- Graceful degradation when a method is unsupported
- Normalized errors (permission denied, cancel, IO, network)
- Progress + cancellation hooks for long operations
- Contract tests asserting behavioral parity on supported ops

## Forbidden

- Domain packages importing `@tauri-apps/*` or `@capacitor/*`
- Feature modules branching on UA strings for privileged behavior
- Storing service_role or provider secrets in any bridge impl
