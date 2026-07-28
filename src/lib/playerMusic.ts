/**
 * Helpers to load user music into AudioBus — local files + library drops.
 */

import type { PlayerTrack } from "@/lib/audioBus";
import { enqueueTracks, loadQueue } from "@/lib/audioBus";
import * as api from "@/lib/api";

const LOCAL_KEY = "vybz.player.localQueueMeta";

export function fileToPlayerTrack(file: File, index = 0): PlayerTrack {
  const url = URL.createObjectURL(file);
  const base = file.name.replace(/\.[^.]+$/, "") || "Untitled";
  return {
    id: `local-${Date.now()}-${index}-${file.name.slice(0, 40)}`,
    url,
    title: base,
    artist: "Uploaded",
    accent: "#00C2FF",
    quality: file.type || "audio",
    seed: (base.length * 17 + index) % 997,
  };
}

/** Probe duration for local files (best-effort). */
export function probeDuration(url: string): Promise<number | undefined> {
  return new Promise((resolve) => {
    const a = new Audio();
    a.preload = "metadata";
    a.src = url;
    const done = () => {
      const d = a.duration;
      resolve(Number.isFinite(d) && d > 0 ? d : undefined);
      a.removeAttribute("src");
      a.load();
    };
    a.addEventListener("loadedmetadata", done, { once: true });
    a.addEventListener("error", () => resolve(undefined), { once: true });
    window.setTimeout(() => resolve(undefined), 4000);
  });
}

export async function uploadLocalFilesToPlayer(
  files: FileList | File[],
  opts?: { replace?: boolean },
): Promise<number> {
  const list = Array.from(files).filter((f) =>
    f.type.startsWith("audio/") || /\.(mp3|wav|flac|m4a|aac|ogg|opus|aiff|aif)$/i.test(f.name),
  );
  if (!list.length) return 0;

  const tracks: PlayerTrack[] = [];
  for (let i = 0; i < list.length; i++) {
    const t = fileToPlayerTrack(list[i], i);
    const dur = await probeDuration(t.url);
    if (dur) t.durationSec = dur;
    tracks.push(t);
  }

  try {
    const meta = tracks.map((t) => ({ id: t.id, title: t.title, artist: t.artist }));
    localStorage.setItem(LOCAL_KEY, JSON.stringify(meta));
  } catch { /* ignore */ }

  if (opts?.replace) loadQueue(tracks, { autoplay: true, loop: tracks.length === 1 });
  else enqueueTracks(tracks, { playFirst: true });
  return tracks.length;
}

export async function loadMyDropsIntoPlayer(limit = 24): Promise<number> {
  const drops = await api.listDrops(limit);
  const tracks: PlayerTrack[] = [];
  for (const d of drops) {
    if (!d.audioUrl) continue;
    tracks.push({
      id: d.id,
      authorId: d.authorId,
      earnEligible: true,
      url: d.audioUrl,
      title: d.title?.trim() || "Drop",
      artist: d.authorUsername?.trim() || "VYBZ",
      durationSec: d.durationSec,
      waveform: d.waveform,
      accent: "#00C2FF",
      seed: d.seed,
    });
  }
  if (!tracks.length) return 0;
  loadQueue(tracks, { autoplay: true });
  return tracks.length;
}

export async function loadOwnDropsIntoPlayer(authorId: string, limit = 40): Promise<number> {
  const drops = await api.dropsBy(authorId, limit);
  const tracks: PlayerTrack[] = [];
  for (const d of drops) {
    if (!d.audioUrl) continue;
    tracks.push({
      id: d.id,
      authorId: d.authorId,
      earnEligible: true,
      url: d.audioUrl,
      title: d.title?.trim() || "Drop",
      artist: d.authorUsername?.trim() || "You",
      durationSec: d.durationSec,
      waveform: d.waveform,
      accent: "#00D68F",
      seed: d.seed,
    });
  }
  if (!tracks.length) return 0;
  loadQueue(tracks, { autoplay: true });
  return tracks.length;
}

/** AI-ish For You radio from taste + discovery signals → VDock. */
export async function loadForYouIntoPlayer(limit = 24): Promise<number> {
  const drops = await api.listForYouDrops(limit);
  const tracks: PlayerTrack[] = [];
  for (const d of drops) {
    if (!d.audioUrl) continue;
    tracks.push({
      id: d.id,
      authorId: d.authorId,
      earnEligible: true,
      url: d.audioUrl,
      title: d.title?.trim() || "For You",
      artist: d.authorUsername?.trim() || "VYBZ",
      durationSec: d.durationSec,
      waveform: d.waveform,
      accent: "#00C2FF",
      seed: d.seed,
    });
  }
  if (!tracks.length) return 0;
  loadQueue(tracks, { autoplay: true });
  return tracks.length;
}

export async function loadVybzListIntoPlayer(listId: string): Promise<number> {
  const ids = await api.vybzListDropIds(listId);
  const drops = await api.dropsByIds(ids);
  const tracks: PlayerTrack[] = [];
  for (const d of drops) {
    if (!d.audioUrl) continue;
    tracks.push({
      id: d.id,
      authorId: d.authorId,
      earnEligible: true,
      url: d.audioUrl,
      title: d.title?.trim() || "Track",
      artist: d.authorUsername?.trim() || "VYBZ",
      durationSec: d.durationSec,
      waveform: d.waveform,
      accent: "#00C2FF",
      seed: d.seed,
    });
  }
  if (!tracks.length) return 0;
  loadQueue(tracks, { autoplay: true });
  return tracks.length;
}
