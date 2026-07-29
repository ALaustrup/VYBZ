# Responsive System

> Suite shell layout: desktop rail vs mobile nav. Preserve VDock reserve.

## Breakpoints (target)

| Name | Intent |
|------|--------|
| Mobile | Single column; bottom or compact top nav |
| Tablet | Collapsible rail or icon rail |
| Desktop | Persistent **PrimaryRail** + main canvas |
| Wide | Optional ContextInspector without crowding |

Exact px values land with Phase 1 tokens; prefer content over rigid magic numbers.

## Shell

```text
Desktop:  [ PrimaryRail ] [ Main / Suite product ] [ optional inspector ]
Mobile:   [ Main ] + MobileNav; rail becomes drawer or bottom tabs
Always:   VDock + --dock-reserve clearance
```

## Rules

- Professional products share SuiteShell; do not invent per-product app frames.
- Marketing / landing may full-bleed outside shell.
- Touch targets ≥ 44px on mobile chrome.
- Never nest tall sheets inside `.vdock-shell` (OverlayPortal).
- Audience atmospheric backgrounds must not hide focus rings or rail labels.

## Navigation mapping

| Desktop | Mobile |
|---------|--------|
| PrimaryRail product switch | MobileNav / SuiteSwitcher sheet |
| CommandBar | Compact search / commands entry |
| ContextInspector | Bottom sheet or omit |

## Authority

Frontend target: [`../architecture/FRONTEND_ARCHITECTURE.md`](../architecture/FRONTEND_ARCHITECTURE.md).
Routes: [`../architecture/ROUTE_MANIFEST.md`](../architecture/ROUTE_MANIFEST.md).
