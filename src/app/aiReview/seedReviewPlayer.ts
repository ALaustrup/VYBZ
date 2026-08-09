import { playTrack, type PlayerTrack } from "@/lib/audioBus";

/** Minimal silent WAV (data URI) — playable without CDN/storage. */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

export const AI_REVIEW_TRACK: PlayerTrack = {
  id: "ai-review-silent",
  authorId: "00000000-0000-4000-a000-0000000000ai",
  artistUsername: "aireviewer",
  url: SILENT_WAV,
  title: "AI Review fixture tone",
  artist: "AI Reviewer",
  durationSec: 1,
  waveform: [0.1, 0.2, 0.15, 0.25, 0.1],
};

/** Load dock with a local silent track (no network). Does not autoplay loudly. */
export function seedReviewPlayer() {
  playTrack(AI_REVIEW_TRACK, [AI_REVIEW_TRACK]);
}
