# VYBZ Engine

User-facing name: **VYBZ Engine**. Compatibility package path remains
[`tools/vybz-bridge/`](../../tools/vybz-bridge/) (`repo-watch-v1` WebSocket on
`127.0.0.1:17355`).

## Responsibilities (current → target)

| Now | Next |
|-----|------|
| Watch project folders | Same |
| Hash / commit-ready prompts | File-role classification suggestions |
| — | Full-track loudness, true peak, FFmpeg delivers |
| — | Artwork scan/repair helpers |
| — | Watermark apply/detect locally |
| — | Offline job queue + capability report |

Web app still owns CAS upload and `repo_commit`. Engine never holds cloud secrets.

## Security

Device registration · rotatable device token · narrow job permissions · signed payloads ·
output hash verify · no arbitrary remote shell · sandboxed command templates ·
explicit approval for destructive ops.

Engine is the primary way to offer sophisticated processing without cloud compute per action.
