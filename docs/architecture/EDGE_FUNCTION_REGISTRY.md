# Edge Function Registry

| Function | JWT | Role | Suite note |
|----------|-----|------|------------|
| `waitlist-join` | off | Public waitlist | Keep |
| `waitlist-notify` | secret header | Launch blast | Keep; quota-aware |
| `weekly-digest` | cron/secret | Digest mail | Keep |
| `cost-alert` | secret header | Cost Sentinel ≥90% owner email | Phase 14; `--no-verify-jwt` |
| `audio-play` | on | Playback auth | Keep |
| `livekit-token` | on | Live tokens | Keep; hard-cap UX |
| `passkey` | mixed | WebAuthn | Keep |
| `oauth-*` | on | OAuth links | Keep |
| `embed` | public-ish | Embeds | Keep |
| `ice-servers` | on | WebRTC ICE | Keep |
| `stripe-*` | webhook/on | Payments | Keep; storefront fulfillment |
| `watermark` | on | Forensic embed | Sentinel foundation |
| `watermark-detect` | on/admin | Attribution | Honest confidence UX |
| `vc-room-renewals` | secret | Vc rooms | Keep |
| `visual-generate` | **on** | fal stills | prepaid / Vc; CoverLab adjacency |
| `storefront-pack-copy` | **on** | Groq copy | Market |
| `storefront-pack-art` | **on** | SVG art | Market |
| `storefront-checkout` | **off** | Checkout session | Market |
| `bunny-upload` | — | Dormant | **Do not re-enable** |
| `bunny-sign` | — | Dormant | **Do not re-enable** |
| `bunny-live` | — | Dormant | **Do not re-enable** |

Deploy notes live in `AGENTS.md`. New functions require provider adapter + cost policy.
