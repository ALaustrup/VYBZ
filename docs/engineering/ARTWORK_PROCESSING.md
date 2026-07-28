# Artwork Processing

## Preference

```text
Browser dimension/format checks → deterministic SVG / templates → fal stills (prepaid_only)
```

## Surfaces

| Surface | Role |
|---------|------|
| CoverLab (Suite) | Artwork analysis, repair, delivery |
| Storefront pack art | `storefront-pack-art` Edge (prefer deterministic SVG) |
| Studio Generate | `visual-generate` + `studioBackdropHandoff.ts` |
| site-visuals CDN | Public marketing / backdrop loops |

## Rules

1. fal never for unmetered decorative generation.
2. Estimate → approve → reserve → reconcile for stills.
3. Public pack previews vs private zips use correct buckets (`storefront-previews` /
   `storefront-zips`).
4. Do not invent rights metadata; humans confirm credits/splits.
5. Honest UX when generation fails or caps hit — fall back to templates/upload.

See [`../operations/COST_CONTROL.md`](../operations/COST_CONTROL.md),
[`BROWSER_COMPUTE.md`](./BROWSER_COMPUTE.md).
