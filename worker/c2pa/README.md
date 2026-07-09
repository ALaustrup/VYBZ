# VYBZ C2PA worker

Attaches **C2PA Content Credentials** (signed provenance manifests) to delivered
audio — the industry-standard, cross-platform provenance layer (§8.7). It wraps
Adobe/CAI's **`c2patool`** (the current maintained tool; audio WAV/MP3 supported),
so it must run in **Node/a container — not a Deno edge function**.

## Status
- ✅ **Verified locally**: signing a WAV with `sign.mjs`'s manifest and reading it
  back yields `"validation_state": "Valid"` with the VYBZ assertions
  (`stds.schema-org.CreativeWork` + `com.vybz.provenance`: asset id, recipient,
  watermark id, license) intact.
- ⏳ **Not yet in the live download path** — it needs a Node host and a signing
  cert. The watermark step runs in a Supabase (Deno) edge function, which can't
  execute `c2patool`; this worker is the C2PA half.

## Where it fits
Delivery pipeline: **permission gate → per-recipient watermark (`watermark` edge fn)
→ C2PA sign (this worker) → deliver**. Point the download flow at this worker (or
have the edge function forward the watermarked bytes here) once it's hosted.

## Run
```bash
# 1. Get c2patool (once):
#    https://github.com/contentauth/c2pa-rs/releases  (c2patool-*-x86_64-unknown-linux-gnu.tar.gz)
export C2PATOOL_BIN=/path/to/c2patool

# 2. Provide an ES256 signing identity:
#    - alpha: a self-signed cert (c2patool ships sample certs for testing)
#    - production: a certificate from a trusted CA (e.g. DigiCert), per C2PA
export C2PA_SIGN_CERT="$(cat certs/es256_certs.pem)"
export C2PA_PRIVATE_KEY="$(cat certs/es256_private.key)"

export WORKER_TOKEN=<shared-secret>
npm start   # POST /sign  (Bearer WORKER_TOKEN, x-vybz-meta base64 header, WAV body)
```

## Hosting (no paid infra required)
Any Node host works — a small container on a free tier, or a Node serverless
function that bundles the `c2patool` binary. Keep the signing key server-side only.

## Notes
- C2PA is **provenance/attribution**, complementary to the forensic watermark: the
  watermark survives stripping (attribution), while C2PA gives verifiable,
  tamper-evident, industry-recognized credentials while the manifest is intact.
- Production requires a CA-issued cert so validators trust the signature chain.
