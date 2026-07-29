# Storage Architecture

## Media origin law

**Supabase Storage only.** Do not re-enable Bunny as CDN/Stream origin.
`VITE_FEATURE_BUNNY_AUDIO` stays off; `bunny-*` Edge functions remain dormant.

## Buckets

| Bucket | Access | Role |
|--------|--------|------|
| `site-visuals` | Public read | Backdrop + VDock loops CDN |
| `media-public` | Public / uid folders | Avatars, public media |
| `audio-assets` | Private | Audio masters |
| `project-files` | Private | Project files |
| `storefront-previews` | Public preview paths | Pack audio previews + cover art |
| `storefront-zips` | Private | Paid pack ZIPs (signed URL after purchase) |
| Music Repos blobs | Private (schema) | Content-addressed blobs |

CDN pattern:

`https://xixmneooyufbeftdfpcm.supabase.co/storage/v1/object/public/site-visuals/...`

Resolver: `src/lib/siteVisuals.ts`. Encode/upload: `npm run visuals:encode` / `visuals:upload`.

## Rules

- Write to public buckets via service_role or constrained RPCs only.
- Signed URLs for private masters and fulfillment.
- Archive derived outputs; retain masters the user explicitly keeps.
