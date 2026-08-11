/**
 * Pre-login featured playback — curated platform tracks only.
 * Asset path + duration measured from production assets row (2026-08-11).
 */
export type FeaturedTrack = {
  id: string;
  dropId: string;
  assetId: string;
  title: string;
  artist: string;
  /** Storage path under audio-assets / stream ticket path. */
  assetPath: string;
  durationSec: number;
};

/** Sign-in / landing featured cut — Helix by CYB3RNOM4D. */
export const FEATURED_SIGNIN_TRACK: FeaturedTrack = {
  id: "featured:helix",
  dropId: "b9226c98-5efc-427f-92e9-a8a5ec7b4e82",
  assetId: "5ab1cd55-0eed-4b10-aa8a-32e3aa03fce2",
  title: "Helix",
  artist: "CYB3RNOM4D",
  assetPath: "9e45224c-f5f0-4af1-960c-8f9b178a4933/drops/1786459395365-7dd06077.mp3",
  durationSec: 516.2057083333333,
};

/** Paths the edge `audio-play` guestFeatured allowlist must accept. */
export const GUEST_FEATURED_ASSET_PATHS: readonly string[] = [FEATURED_SIGNIN_TRACK.assetPath];
