# VYBZ Bridge (VYBZ Engine)

Local companion for **Music Repos** folder watch + auto-commit prompts.
User-facing rename target: **VYBZ Engine** (package path may keep `vybz-bridge` for compatibility).

See [`docs/architecture/VYBZ_ENGINE.md`](../../docs/architecture/VYBZ_ENGINE.md).

## Install & run

```bash
cd tools/vybz-bridge
npm install
npm start
```

Listens on `ws://127.0.0.1:17355` (override with `VYBZ_BRIDGE_PORT`).

## Protocol (`repo-watch-v1`)

| Client → Bridge | Bridge → Client |
|-----------------|-----------------|
| `hello` | `pong` |
| `watch { path, projectId?, debounceMs?, autoCommit? }` | `watching` |
| `unwatch { path? }` | `unwatched` |
| `status` | `status` |
| `commit-ack { path, message? }` | `commit-acked` |

After a debounced save in a watched DAW folder:

- Always: `folder-changed`
- If `autoCommit: true`: `commit-ready` with an `Autosave · HH:MM` message

The **web app** owns auth, CAS upload to **Supabase Storage** (Music Repos blob RPCs),
and `repo_commit`. Bridge never stores API keys. Dormant `bunny-*` paths must not be used.

## Platform notes

- **Windows / macOS:** Node `fs.watch({ recursive: true })` — works for Ableton/FL project trees; noisy caches (`.asd`, Ableton Project Info) are filtered when filenames are reported.
- Pair with Studio → Repo → **Commit folder** until the PWA wires `commit-ready` to `syncRepoFolder`.

## Tray / packaging

Watch protocol server today. System-tray installer and Engine analysis jobs are follow-ups (Suite Studio / MasterReady phases).
