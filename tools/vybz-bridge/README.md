# VYBZ Bridge

Local companion for **Music Repos** folder watch + auto-commit prompts (phase R4 / H5).

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

The **web app** (or future native shell) owns auth, CAS upload via `bunny-upload` (`kind=repo-blob`), and `repo_commit`. Bridge never stores API keys.

## Platform notes

- **Windows / macOS:** Node `fs.watch({ recursive: true })` — works for Ableton/FL project trees; noisy caches (`.asd`, Ableton Project Info) are filtered when filenames are reported.
- Pair with Studio → Repo → **Commit folder** until the PWA wires `commit-ready` to `syncRepoFolder`.

## Tray / packaging

This is the watch protocol server. A system-tray installer is a follow-up; for Beta-0B run Bridge from a terminal while producing.
