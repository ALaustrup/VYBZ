# Local Stable Audio 3 worker

The VYBZ app does not load these weights. Generate talks to a loopback worker.

1. Keep the clone at `Documents/stable-audio-3` (sibling of this repo), or set `VYBZ_STABLE_AUDIO_3`.
2. In that clone: install [uv](https://github.com/astral-sh/uv), then `uv sync`. First generate downloads `small-music` from Hugging Face.
3. Weights are Stability AI Community License. Show “Powered by Stability AI” (the Generate sheet does).
4. From VYBZ: `npm run generate:worker`
5. In the app: **+ → Generate**. The WAV enters the existing upload queue. It is not published until you Release, and it is not placed on My VYBZ until you Place.

Large (Stability API) is not wired.
