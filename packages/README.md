# packages/ — future workspace home (Stage B+)

Phase 1.5 **does not move** application source into `packages/`.

In-tree Stage A boundaries (authoritative until extraction):

| Alias | Path |
|-------|------|
| `@vybz/contracts` | `src/contracts` |
| `@vybz/platform` | `src/platform/bridge` (+ siblings under `src/platform`) |
| `@vybz/domain` | `src/domain` |
| `@vybz/domain/releases` | `packages/domain/releases` |
| `@vybz/data/releases` | `packages/data/releases` |
| `@vybz/processing/readiness` | `packages/processing/readiness` |
| `@vybz/processing/waveform` | `packages/processing/waveform` |
| `@vybz/domain/credits` | `packages/domain/credits` |
| `@vybz/data/credits` | `packages/data/credits` |

Target extraction (later stages — see `docs/archive/suite-phases-2026/REPO_WORKSPACE_PLAN.md`):

```text
packages/
  app/
  ui/
  domain/       # releases present (Phase 2)
  data/         # releases present (Phase 2)
  platform/
  processing/   # readiness present (Phase 2)
  contracts/
  configuration/
  testing/
```

**Rule:** do not relocate files merely to match this diagram. Extract when ownership is clear and CI stays green.
