/**
 * Always-on ambient radio — seeds AudioBus after auth.
 * Prefers network drops with playable audio; falls back to a soft generated pad.
 */

import * as api from "@/lib/api";
import { getSnapshot, loadQueue, type PlayerTrack } from "@/lib/audioBus";

const AMBIENT_ID = "vybz-ambient-pad";
let padUrl: string | null = null;
let startedForUser: string | null = null;

function writeWav(samples: Float32Array, sampleRate: number): Blob {
  const n = samples.length;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  w(0, "RIFF");
  v.setUint32(4, 36 + n * 2, true);
  w(8, "WAVE");
  w(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, "data");
  v.setUint32(40, n * 2, true);
  let o = 44;
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    o += 2;
  }
  return new Blob([buf], { type: "audio/wav" });
}

/** Soft looping pad — cyan-smoke vibe, no external CDN dependency. */
export async function ensureAmbientPadTrack(): Promise<PlayerTrack> {
  if (!padUrl) {
    const sr = 22050;
    const dur = 16;
    const n = sr * dur;
    const samples = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const env = 0.55 + 0.45 * Math.sin((Math.PI * 2 * t) / dur);
      const a = Math.sin(2 * Math.PI * 110 * t) * 0.12;
      const b = Math.sin(2 * Math.PI * 164.81 * t) * 0.08;
      const c = Math.sin(2 * Math.PI * 220 * t) * 0.05;
      const d = Math.sin(2 * Math.PI * 0.08 * t) * 0.02;
      samples[i] = (a + b + c + d) * env * 0.55;
    }
    padUrl = URL.createObjectURL(writeWav(samples, sr));
  }
  return {
    id: AMBIENT_ID,
    url: padUrl,
    title: "VYBZ Radio",
    artist: "Ambient",
    durationSec: 16,
    accent: "#00C2FF",
    seed: 7,
  };
}

function dropToTrack(d: {
  id: string;
  title?: string | null;
  audioUrl?: string;
  durationSec?: number;
  waveform?: number[];
  authorUsername?: string | null;
  authorId?: string;
  seed?: number;
  playbackCustomization?: import("@/lib/playbackCustomization").PlaybackCustomization | null;
}): PlayerTrack | null {
  if (!d.audioUrl || !/^(https?:|blob:|data:)/i.test(d.audioUrl)) return null;
  return {
    id: d.id,
    url: d.audioUrl,
    authorId: d.authorId,
    artistUsername: d.authorUsername?.trim() || undefined,
    earnEligible: true,
    title: d.title?.trim() || "Drop",
    artist: d.authorUsername?.trim() || "VYBZ",
    durationSec: d.durationSec,
    waveform: d.waveform,
    accent: "#00C2FF",
    seed: d.seed,
    playback: d.playbackCustomization ?? undefined,
  };
}

/**
 * Start soundtrack after login. Safe if called twice; skips when user already
 * has a non-ambient track loaded (e.g. listen-together / feed play).
 */
export async function startAmbientRadio(userId: string): Promise<void> {
  if (startedForUser === userId) return;
  const snap = getSnapshot();
  if (snap.track && snap.track.id !== AMBIENT_ID) {
    startedForUser = userId;
    return;
  }

  let list: PlayerTrack[] = [];
  try {
    const drops = await api.listDrops(24);
    for (const d of drops) {
      const t = dropToTrack(d as Parameters<typeof dropToTrack>[0]);
      if (t) list.push(t);
      if (list.length >= 12) break;
    }
  } catch { /* offline / empty catalog */ }

  // Prefer a previously connected Spotify-imported queue from local cache.
  if (!list.length) {
    try {
      const raw = localStorage.getItem(`vybz.playlist.queue.${userId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as PlayerTrack[];
        if (Array.isArray(parsed) && parsed.some((t) => t?.url)) {
          list = parsed.filter((t) => t?.url);
        }
      }
    } catch { /* ignore */ }
  }

  if (!list.length) {
    list = [await ensureAmbientPadTrack()];
    loadQueue(list, { autoplay: true, loop: true });
  } else {
    loadQueue(list, { autoplay: true, loop: false });
  }
  startedForUser = userId;
}

export function resetAmbientRadioGate() {
  startedForUser = null;
}
