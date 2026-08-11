/**
 * Vibes Radio client — sync to server clock, play via AudioBus (Law 5 dry path).
 */

import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from "@/lib/supabase";
import {
  getSnapshot,
  playTrack,
  seek,
  setVolume,
  type PlayerTrack,
} from "@/lib/audioBus";
import { ambientSignal, catalogSignal } from "@/lib/vdock/playbackSignal";
import { resolveStationUrl } from "@/features/radio/stationBeds";

export type VibesRadioAudience = "guest" | "member";

export type VibesRadioSync = {
  trackId: string;
  kind: string;
  startedAt: string;
  serverNow: string;
  durationSec: number;
  positionSec: number;
  title: string;
  artist: string | null;
  audioUrl: string;
  dropId: string | null;
  guestSafe: boolean;
  metadata: { format: string; durationSec: number };
};

type Listener = () => void;

let lastSync: VibesRadioSync | null = null;
let skewMs = 0;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

export function getVibesRadioSync(): VibesRadioSync | null {
  return lastSync;
}

export function getVibesRadioSkewMs(): number {
  return skewMs;
}

export function subscribeVibesRadio(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function fetchVibesRadioSync(
  audience: VibesRadioAudience,
): Promise<VibesRadioSync | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const sess = (await supabase?.auth.getSession())?.data.session;
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    "content-type": "application/json",
  };
  if (sess?.access_token) headers.authorization = `Bearer ${sess.access_token}`;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/vibes-radio`, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "sync", audience }),
  });
  if (!res.ok) {
    console.warn("[vibes-radio] sync failed", res.status);
    return null;
  }
  const data = (await res.json()) as VibesRadioSync;
  if (!data?.audioUrl || !data.startedAt || !data.serverNow) return null;

  skewMs = Date.parse(data.serverNow) - Date.now();
  lastSync = data;
  emit();
  return data;
}

export function computeRadioPositionSec(sync: VibesRadioSync, now = Date.now()): number {
  const started = Date.parse(sync.startedAt);
  const elapsed = (now + skewMs - started) / 1000;
  return Math.max(0, Math.min(elapsed, Math.max(0, sync.durationSec - 0.05)));
}

/**
 * Join the global broadcast: load current item and seek to server position.
 * Soft volume ramp on item change (crossfade approximation — Law 5 volume only).
 */
export async function joinVibesRadio(audience: VibesRadioAudience): Promise<VibesRadioSync | null> {
  const sync = await fetchVibesRadioSync(audience);
  if (!sync) return null;

  const absoluteUrl = resolveStationUrl(sync.audioUrl, window.location.origin);
  const isBed = sync.kind === "greeting" || sync.kind === "interstitial";
  const absolute: PlayerTrack = {
    id: `vibes-radio:${sync.trackId}:${sync.startedAt}`,
    url: absoluteUrl,
    title: sync.title || "Vibes Radio",
    artist: sync.artist || "VYBZ",
    durationSec: sync.durationSec,
    signal: isBed ? ambientSignal() : catalogSignal(),
  };

  const snap = getSnapshot();
  if (snap.track?.id === absolute.id) {
    seek(computeRadioPositionSec(sync));
    return sync;
  }

  const prevId = snap.track?.id;
  const vol = snap.volume;
  if (prevId && prevId !== absolute.id) {
    setVolume(Math.max(0.05, vol * 0.35));
  }

  playTrack(absolute, [absolute]);

  const applySeek = () => {
    const pos = computeRadioPositionSec(sync);
    seek(pos);
    setVolume(vol || 0.9);
  };

  window.setTimeout(applySeek, 120);
  window.setTimeout(applySeek, 400);

  return sync;
}

export async function optInToVibesRadio(input: {
  dropId: string;
  audioUrl: string;
  title?: string;
  artist?: string | null;
  durationSec: number;
}): Promise<{ ok: true; poolId: string } | { ok: false; error: string }> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { ok: false, error: "Backend not configured" };
  const sess = (await supabase?.auth.getSession())?.data.session;
  if (!sess?.access_token) return { ok: false, error: "Sign in required" };

  const res = await fetch(`${SUPABASE_URL}/functions/v1/vibes-radio`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${sess.access_token}`,
      apikey: SUPABASE_ANON_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      action: "opt_in",
      dropId: input.dropId,
      audioUrl: input.audioUrl,
      title: input.title,
      artist: input.artist,
      durationSec: input.durationSec,
    }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: (j as { error?: string }).error ?? `HTTP ${res.status}` };
  return { ok: true, poolId: (j as { poolId: string }).poolId };
}

/** Test seam. */
export function resetVibesRadioClient(): void {
  lastSync = null;
  skewMs = 0;
}
