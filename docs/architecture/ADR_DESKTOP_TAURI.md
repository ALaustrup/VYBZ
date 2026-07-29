# ADR: VYBZ Desktop = Tauri 2 (Windows first)

| Field | Value |
|-------|--------|
| Status | **Accepted** (Suite Genesis multi-platform expansion) |
| Date | 2026-07-28 |
| Products | VYBZ Desktop |

## Context

VYBZ needs a professional workstation client for large local files, batch work,
native dialogs, and local processing — without rewriting the React application.

## Decision

Use **Tauri 2** to package the shared Vite/React UI and expose native capabilities
through allowlisted Rust commands / plugins, accessed only via **Platform Bridge**.

Initial shipping target: **Windows**. Architecture must not block macOS/Linux later.

## Consequences

- Desktop is still an **untrusted client**; RLS and server jobs remain authoritative.
- VYBZ Engine (`tools/vybz-bridge`) remains a separate local companion; Desktop may
  invoke Engine over time but must not conflate Engine with Platform Bridge.
- Phase 1.5 delivers a PoC; Phase 2.D delivers Windows alpha.

## Alternatives considered

| Option | Why not (now) |
|--------|----------------|
| Electron | Heavier runtime / distribution cost |
| Pure native UI rewrite | Duplicates Suite UI; violates one-product-core |
| Web-only PWA | Insufficient for professional local workflows |

## Non-goals

macOS/Linux release in Phase 1.5–2.D; arbitrary shell execution; full FS access.
