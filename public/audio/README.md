# Veiled audio

Drop sound files here and the platform plays them automatically. The logical
name → path mapping lives in `src/lib/soundManifest.ts`.

## Formats — what to produce

**Master / source:** WAV, 48 kHz, 24-bit. Keep these in your DAW; don't ship them.

**Ship to the app:** **Opus in a `.webm` container** (`.webm`). It's tiny,
gapless, and decodes everywhere the app runs (all modern browsers + the Meta
Quest browser) via the Web Audio API. Encode from your master, e.g.:

```bash
# one short SFX
ffmpeg -i tap.wav -c:a libopus -b:a 96k tap.webm

# music / ambience (stereo, a touch higher bitrate)
ffmpeg -i theme.wav -c:a libopus -b:a 128k theme.webm
```

If you'd rather hand off masters and let us encode, ship **WAV (48k/24-bit)** and
we'll convert. (We can also fall back to `.m4a`/AAC or `.mp3` if ever needed, but
Opus/webm is the default.)

## Guidelines

- **SFX:** short (50–400 ms), trimmed to zero-crossings, normalized to ~ -1 dBFS
  true peak, mono is fine. Subtle and tactile — this is a calm, premium product.
- **Loudness:** consistent across the set so nothing jumps out. Aim around
  -16 LUFS integrated for UI ticks; quieter for frequent events (taps).
- **Naming:** match the paths in `soundManifest.ts`. Current slots:

```
ui/tap.webm        ui/open.webm     ui/close.webm    ui/post.webm
ui/unveil.webm     ui/veil.webm     ui/message.webm  ui/notify.webm
ui/coin.webm
game/start.webm    game/point.webm  game/miss.webm   game/over.webm
game/levelup.webm
```

## How to hand them to me

Any of these works:

1. **Commit them** into `apps/veiled/public/audio/<ui|game>/…` matching the names
   above and tell me — I'll verify they load and wire any new ones.
2. **Share a link** (Drive/Dropbox/zip) and I'll place + encode them.
3. Want **new sound slots**? Tell me the events you have audio for and I'll add
   them to `soundManifest.ts` and trigger them at the right moments.
