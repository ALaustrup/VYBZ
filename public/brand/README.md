# MYVYB brand assets

These are the official MYVYB assets exported from the master brand kit. The app
picks them up automatically — to refresh the brand, replace the source artwork
and regenerate (see "Regenerating" below).

## Mark (the gradient speech-bubble + node symbol)

- **`icon.svg`** — preferred. Vector, transparent, trimmed tightly to the mark
  (viewBox `1118 81 934 982`). Scales perfectly everywhere.
- **`icon.png`** — 1024px raster fallback, transparent background.

`<BrandMark />` (`src/components/Brand.tsx`) loads `icon.svg`, then `icon.png`,
then falls back to a hand-built linked-nodes mark — so the UI is never broken.

## Wordmark (the "myvyb" lettering)

- **`wordmark.svg`** — preferred. Vector, transparent, pale-blue (`#c9ebf8`),
  trimmed tightly to the glyphs (viewBox `81 1394 3001 683`).
- **`wordmark.png`** — ~2000px transparent raster fallback.

`<Wordmark />` loads `wordmark.svg`, then `wordmark.png`, then falls back to a
styled text lockup. `<BrandLockup />` pairs the mark + wordmark for headers/nav.

## Derived icons (generated, do not hand-edit)

All generated from `icon.svg`:

- `public/favicon.svg` (vector tab icon) + `public/favicon-64.png` (dark tile)
- `public/icons/icon-192.png`, `icon-512.png` (dark tiles, ~82% safe area)
- `public/icons/maskable-512.png` (extra safe-zone padding for Android maskable)
- `public/icons/apple-touch-icon.png` (180px dark tile)
- `public/og.png` (1200×630 share image: mark + wordmark on near-black)

## Source / master

- `logo-master.png` — the full color logo on the dark brand background, for
  reference. The full kit (SVG/PNG/PDF, favicons, social cuts) lives in the
  shared MYVYB brand Drive folder.

## Regenerating

Icons/OG were produced by rendering `icon.svg` / `wordmark.svg` with `sharp`
(trim → resize → compose on `#050307`). Re-run that pipeline if you change the
mark; keep the consumed paths/sizes identical so `index.html`, the PWA manifest
(`vite.config.ts`), and JSON-LD continue to resolve.
