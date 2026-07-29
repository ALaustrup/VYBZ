# VYBZ release versioning

Canonical product labels use the **Beta-NL[.P]** scheme. Tooling keeps a parallel
[SemVer](https://semver.org/) in `package.json` so npm, Vercel, and changelogs stay machine-readable.

## Eras

| Era | Scope |
|-----|--------|
| **Alpha** | All development **before** the `Beta-0A` tag (pivot through Orb/taskbar unification). Historical only ΓÇö do not open new Alpha labels. |
| **Beta** | Current public platform line, starting at **Beta-0A**. **Launch wedge (2026-07):** tip + live + catalog for indie artists; marketing landing + alpha waitlist. |

## Label grammar

```
Beta-{N}{L}[.{P}]
```

| Part | Meaning | Examples |
|------|---------|----------|
| **N** | Platform generation (larger patches / architecture eras) | `0`, `1`, `2` |
| **L** | Phased update within that generation (AΓåÆBΓåÆCΓÇª) | `A`, `B`, `C` |
| **P** | Optional micro patch / hotfix within the current phase | `.1`, `.2` |

Progression:

```
Beta-0A ΓåÆ Beta-0A.1 ΓåÆ Beta-0A.2 ΓåÆ ΓÇª ΓåÆ Beta-0B ΓåÆ Beta-0C ΓåÆ ΓÇª ΓåÆ Beta-1A ΓåÆ ΓÇª
```

Rules:

1. Bump **P** for fixes and small polish that stay on the same phase.
2. Bump **L** (reset **P**) when a coherent phased update ships (new surface area, UX pass, feature slice).
3. Bump **N** (reset **L** to `A`, reset **P**) for a larger platform generation change.
4. Every shipped label gets an **annotated git tag** with the exact same spelling (`Beta-0A`, `Beta-0A.1`, ΓÇª).
5. `main` is always the integration + production branch. Release branches are optional snapshots (see below).

## SemVer mapping (`package.json` ΓåÆ `version`)

| Product label | `package.json` version |
|---------------|------------------------|
| Beta-0A | `0.1.0` |
| Beta-0A.1 | `0.1.1` |
| Beta-0B | `0.2.0` |
| Beta-0C | `0.3.0` |
| Beta-1A | `1.1.0` |
| Beta-1A.2 | `1.1.2` |

Formula: `{N}.{letterIndex}.{P}` where `A=1`, `B=2`, ΓÇª and omitted `.P` means `0`.

Also set `vybz.release` in `package.json` to the human label (e.g. `"Beta-0A"`) so UI/docs can show it without decoding SemVer.

## Git workflow (efficient default)

```
tag Alpha          ΓåÉ freeze end of Alpha (already shipped history)
tag Beta-0A        ΓåÉ this baseline
branch Beta-0A     ΓåÉ optional snapshot of the baseline (docs / hotfixes)
main               ΓåÉ continue all forward work; tag Beta-0A.1, Beta-0B, ΓÇª
```

**Prefer tags over a branch per letter.** Create `Beta-0B` (etc.) as a branch only when you need a long-lived hotfix line while `main` has already moved on. Otherwise:

```bash
# After merging the release to main and updating package.json + CHANGELOG:
git tag -a Beta-0A.1 -m "Beta-0A.1 ΓÇö <one-line why>"
git push origin main --tags
```

Production deploy: push to `origin/main` ΓåÆ Vercel project `astramatrix/vybz` ΓåÆ `https://vybz.cloud`.

## Checklist for the next label

1. Land work on `main` (PR or direct, per team norm).
2. Update `package.json` `version` + `vybz.release`.
3. Add a section under [`CHANGELOG.md`](./CHANGELOG.md).
4. `npm run lint` && `npm run build`.
5. Annotated tag matching the product label; push `main` + tags.
6. Confirm Vercel production deploy for `vybz.cloud`.

## Why not SemVer-only?

SemVer alone (`0.1.1`) is efficient for tools but opaque for product conversation. The Beta label is the **spoken** version; SemVer is the **machine** twin. Do not invent a third scheme.
