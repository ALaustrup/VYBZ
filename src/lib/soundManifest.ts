/**
 * Logical sound names → files served from `public/audio/`.
 *
 * Drop the audio files at these paths and they play automatically. Until a file
 * exists, the player no-ops gracefully (a missing/!ok fetch is remembered and
 * never retried), so the app is never broken by absent assets.
 *
 * Recommended delivery format: **Opus in a .webm container** (tiny, gapless,
 * universally decodable by the Web Audio API on every modern browser and the
 * Quest browser). See README in `public/audio/`.
 */
const BASE = "/audio";

export const SOUND_MANIFEST = {
  // --- UI / platform ---
  tap: `${BASE}/ui/tap.webm`,
  open: `${BASE}/ui/open.webm`,
  close: `${BASE}/ui/close.webm`,
  post: `${BASE}/ui/post.webm`,
  unveil: `${BASE}/ui/unveil.webm`,
  veil: `${BASE}/ui/veil.webm`,
  message: `${BASE}/ui/message.webm`,
  notify: `${BASE}/ui/notify.webm`,
  coin: `${BASE}/ui/coin.webm`,
  // --- Games ---
  gameStart: `${BASE}/game/start.webm`,
  gamePoint: `${BASE}/game/point.webm`,
  gameMiss: `${BASE}/game/miss.webm`,
  gameOver: `${BASE}/game/over.webm`,
  levelUp: `${BASE}/game/levelup.webm`,
} as const;

export type SoundName = keyof typeof SOUND_MANIFEST;
