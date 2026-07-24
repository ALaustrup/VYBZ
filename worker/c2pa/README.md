# VYBZ C2PA worker

Attaches **C2PA Content Credentials** (signed provenance manifests) to delivered
audio — the industry-standard, cross-platform provenance layer (masterplan §8.7).
It wraps Adobe/CAI's **`c2patool`**, so it runs in **Node/a container — not the
Deno edge**.

## Status
- ✅ **Verified end-to-end (locally)**: the `watermark` edge function watermarks a
  WAV → forwards it to this worker's `POST /sign` → the delivered file validates
  (`validation_state: "Valid"`) with the VYBZ assertions
  (`stds.schema-org.CreativeWork` + `com.vybz.provenance`: asset id, recipient,
  watermark id, license) **and the forensic watermark survives byte-for-byte**
  (C2PA writes a metadata chunk without touching PCM samples).
- Signing uses a **self-signed ES256 cert** for staging (auto-generated on first
  boot); production should swap in a CA-issued cert so validators trust the chain.
- Live hosting remains **infra-gated** (needs a reachable Docker host). Until
  `C2PA_WORKER_*` secrets are set, downloads deliver watermarked-only files
  (safe fallback).

## Deploy (staging / production host)
```bash
# On 51.210.209.112 (Docker + Docker Compose installed):
git clone <repo> && cd worker/c2pa
WORKER_TOKEN="$(openssl rand -hex 24)" docker compose up -d --build
# A self-signed signing cert is generated into the c2pa-certs volume on first boot.
# Verify:  curl -sf -X POST localhost:8787/sign -H "Authorization: Bearer $WORKER_TOKEN" ...
```
Put it behind the existing Nginx (or expose `:8787` only on a private network).
Keep `WORKER_TOKEN` and the signing key server-side only.

## Activate the chain (watermark → C2PA)
Set two Supabase edge secrets, then downloads are watermarked **and** C2PA-signed:
```bash
supabase secrets set C2PA_WORKER_URL="http://51.210.209.112:8787" \
                     C2PA_WORKER_TOKEN="<the WORKER_TOKEN>" \
                     --project-ref xixmneooyufbeftdfpcm
```
The `watermark` edge function forwards the watermarked WAV to `POST /sign`; if the
worker is unset/unreachable it delivers the **watermarked-only** file (safe
fallback) and never blocks a download (15s timeout). A successful sign is recorded
as a `c2pa` event in the provenance ledger, and the response carries `X-VYBZ-C2PA: 1`.

## Files
- `sign.mjs` — manifest builder + `signAudio` / `readManifest` (wraps `c2patool`).
- `server.mjs` — `POST /sign` (Bearer `WORKER_TOKEN`, `x-vybz-meta` base64 header, WAV body).
- `gen-cert.sh` — self-signed ES256 staging cert (EKU emailProtection, KU digitalSignature).
- `entrypoint.sh` — generates the cert if absent, then starts the server.
- `Dockerfile` / `docker-compose.yml` — bundles `c2patool` + runs the worker.

## Hosting requirement (glibc)
Use a **container host** (Fly.io / Render, or any VPS with Docker). The
`c2patool` linux-gnu binary links **GLIBC_2.39**, so glibc-2.36 environments fail at
runtime with `GLIBC_2.39 not found`. The image is therefore based on **Ubuntu 24.04**
(glibc 2.39). For the same reason **Vercel serverless is NOT viable** — its Amazon
Linux 2023 runtime ships glibc ~2.34, so the binary can't load there.

## Notes
- C2PA is **provenance/attribution**, complementary to the forensic watermark: the
  watermark survives stripping (attribution even after the manifest is removed),
  while C2PA gives verifiable, tamper-evident, industry-recognized credentials.
- Production requires a CA-issued cert so validators trust the signature chain.
- Never commit signing material — `certs/`, `*.key`, `*.pem` are git-ignored.
