# Capacitor

> Native shell is preserved, not rewritten. Suite remains a web-first SPA; Capacitor wraps
> where mobile install is needed.

## Rules

1. Do not fork product logic into native-only paths without shared web source.
2. Auth: passkeys / web flows must work in the WebView context used in production.
3. Media: Storage URLs + LiveKit — no Bunny native dependency.
4. Secrets stay off-device binaries; use the same Supabase anon key pattern as web.
5. Camera / mic permissions align with Go Live / Permissions-Policy.

## When changing Capacitor

- Bump native projects only when plugin or deep-link needs demand it.
- Test VDock audio focus and background behavior on device before release notes.
- Document store listing claims honestly (no unproven Sentinel marketing).

See [`DEVELOPMENT.md`](./DEVELOPMENT.md), [`AUDIO_PROCESSING.md`](./AUDIO_PROCESSING.md).
