# VYBZ release versioning

Canonical product labels use the **Beta-NL[.P]** scheme. Tooling keeps a parallel
[SemVer](https://semver.org/) in `package.json`.

## Eras

| Era | Scope |
|-----|--------|
| **Alpha** | Development before tag `Beta-0A`. Historical only. |
| **Beta 0** | Music Hub launch wedge (tip + live + catalog) through `Beta-0B.x`. Archived doctrine: `docs/archive/pre-suite-2026/`. |
| **Beta 1 — Suite Genesis** | Release operating system. Starts at planned **`Beta-1A`**. Codename: **Suite Genesis**. |

## Current plan (important)

| Field | Value |
|-------|--------|
| Planned label | **Beta-1A** |
| Planned SemVer | **1.1.0** |
| Codename | Suite Genesis |
| Git tag | **Do not create** until Suite shell, shared cost kernel, and first Prepare readiness scan pass production gates |
| Working branch | `suite-genesis` |

`package.json` may already show `1.1.0` / `Beta-1A` as **in-progress metadata** during doctrine and foundation work. That is not a shipped release.

## Label grammar

```
Beta-{N}{L}[.{P}]
```

| Part | Meaning |
|------|---------|
| **N** | Platform generation (architecture eras) |
| **L** | Phased update within generation (A→B→C…) |
| **P** | Optional hotfix |

Rules:

1. Bump **P** for fixes on the same phase.
2. Bump **L** (reset **P**) for a coherent phased update.
3. Bump **N** (reset **L**→A) for a larger platform generation — Suite Genesis is **N=1**.
4. Every **shipped** label gets an annotated git tag with identical spelling.
5. `main` remains production integration; feature work merges via PR after Suite Genesis begins.

## SemVer mapping

| Product label | `package.json` version |
|---------------|------------------------|
| Beta-0A | `0.1.0` |
| Beta-0B | `0.2.0` |
| Beta-1A | `1.1.0` |
| Beta-1A.2 | `1.1.2` |

Formula: `{N}.{letterIndex}.{P}` where `A=1`, `B=2`, …; omitted `.P` means `0`.

Also set `vybz.release` to the human label and `vybz.era` to `beta`.

## Checklist for a shipped label

1. Land work on `main` via reviewed PR.
2. Update `package.json` `version` + `vybz.release`.
3. Update [`CHANGELOG.md`](./CHANGELOG.md).
4. `npm run lint` && `npm run build` (+ Phase 1+ test suites).
5. Annotated tag; push `main` + tags.
6. Confirm production deploy for `vybz.cloud`.
7. Confirm provider modes and cost caps documented.
