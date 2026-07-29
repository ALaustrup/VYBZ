# packages/ — future workspace home (Stage B+)

Phase 1.5 **does not move** application source into `packages/`.

In-tree Stage A boundaries (authoritative until extraction):

| Alias | Path |
|-------|------|
| `@vybz/contracts` | `src/contracts` |
| `@vybz/platform` | `src/platform/bridge` (+ siblings under `src/platform`) |
| `@vybz/domain` | `src/domain` |

Target extraction (later stages — see `docs/architecture/REPO_WORKSPACE_PLAN.md`):

```text
packages/
  app/
  ui/
  domain/
  data/
  platform/
  processing/
  contracts/
  configuration/
  testing/
```

**Rule:** do not relocate files merely to match this diagram. Extract when ownership is clear and CI stays green.
