## Vibes Radio station beds (OR-043)

| File | Title | Measured duration | Role |
|---|---|---|---|
| `1.wav` | You're what's next | 9.125 s | Signed-in greeting only |
| `2.wav` | Hear something new | 7.875 s | Interstitial (guests + members) |

Served from this folder / CDN. **Never** embed in the `vibes-radio` edge function.

---

# VYBZ UI audio

Drop sound files here and the platform plays them automatically. The logical
name → path mapping lives in `src/lib/soundManifest.ts`.

**Beta-0A status:** manifest keys exist; **no `.webm` files are shipped yet**.
Missing files no-op gracefully (`primeAudio` / `playSound` never break the app).

## Formats — what to produce

**Master / source:** WAV, 48 kHz, 24-bit. Keep these in your DAW; don't ship them.

**Ship to the app:** **Opus in a `.webm` container** (`.webm`). It's tiny,
gapless, and decodes everywhere the app runs (all modern browsers) via the
Web Audio API. Encode from your master, e.g.:

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
  true peak, mono is fine. Subtle and tactile — calm, premium product feedback.
- **Loudness:** consistent across the set so nothing jumps out. Aim around
  −16 LUFS integrated for longer loops; SFX by peak.
- **Naming:** match keys in `src/lib/soundManifest.ts` under `public/audio/`.

## Shipping

1. **Commit** files into `public/audio/<ui|game>/…` matching manifest names.
2. Rebuild / redeploy — Vite copies `public/` into `dist/` as-is.
