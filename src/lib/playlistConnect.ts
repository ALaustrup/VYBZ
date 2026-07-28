/**
 * Playlist Connect (v1) — Spotify URL → VYBZ queue entity.
 * OAuth path when FLAGS.oauthSpotify; paste-URL always available.
 */

import * as api from "@/lib/api";
import type { PlayerTrack } from "@/lib/audioBus";
import { loadQueue } from "@/lib/audioBus";
import { ensureAmbientPadTrack } from "@/lib/ambientRadio";

export interface ConnectedPlaylist {
  id: string;
  provider: "spotify" | "soundcloud" | "apple";
  externalUrl: string;
  title: string;
  trackCount: number;
  connectedAt: number;
}

export function parseSpotifyPlaylistUrl(input: string): string | null {
  const u = input.trim();
  const m = u.match(/open\.spotify\.com\/(intl-[a-z]+\/)?playlist\/([A-Za-z0-9]+)/i);
  if (m) return `https://open.spotify.com/playlist/${m[2]}`;
  const uri = u.match(/spotify:playlist:([A-Za-z0-9]+)/i);
  if (uri) return `https://open.spotify.com/playlist/${uri[1]}`;
  return null;
}

async function oembedTitle(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const j = (await res.json()) as { title?: string };
    return j.title?.trim() || null;
  } catch {
    return null;
  }
}

/** Build a soft stand-in queue labeled from the playlist until native previews exist. */
async function placeholderQueue(title: string, count = 4): Promise<PlayerTrack[]> {
  const pad = await ensureAmbientPadTrack();
  return Array.from({ length: Math.max(1, Math.min(count, 8)) }, (_, i) => ({
    ...pad,
    id: `${pad.id}-${i}`,
    title: i === 0 ? title : `${title} · ${i + 1}`,
    artist: "Spotify · VYBZ",
  }));
}

export async function connectSpotifyPlaylist(
  userId: string,
  rawUrl: string,
): Promise<{ playlist: ConnectedPlaylist; tracks: PlayerTrack[] } | null> {
  const url = parseSpotifyPlaylistUrl(rawUrl);
  if (!url) return null;
  const title = (await oembedTitle(url)) || "Spotify playlist";
  const tracks = await placeholderQueue(title, 5);
  const playlist: ConnectedPlaylist = {
    id: `sp_${url.split("/").pop()}`,
    provider: "spotify",
    externalUrl: url,
    title,
    trackCount: tracks.length,
    connectedAt: Date.now(),
  };

  try {
    localStorage.setItem(`vybz.playlist.queue.${userId}`, JSON.stringify(tracks));
    localStorage.setItem(`vybz.playlist.meta.${userId}`, JSON.stringify(playlist));
  } catch { /* ignore */ }

  // Persist on profile when backend available (jsonb; tables optional).
  try {
    const me = await api.getMyProfile(userId);
    const prev = (me?.profile ?? {}) as import("@/types").ProfileDetails;
    const list = Array.isArray(prev.connectedPlaylists) ? prev.connectedPlaylists : [];
    const next = [playlist, ...list.filter((p) => p.id !== playlist.id)].slice(0, 8);
    await api.updateMyProfile({
      profile: { ...prev, connectedPlaylists: next },
    });
    await api.upsertConnectedPlaylist(playlist, tracks);
  } catch { /* demo / RLS */ }

  loadQueue(tracks, { autoplay: true, loop: true });
  return { playlist, tracks };
}

export function loadCachedPlaylistMeta(userId: string): ConnectedPlaylist | null {
  try {
    const raw = localStorage.getItem(`vybz.playlist.meta.${userId}`);
    return raw ? (JSON.parse(raw) as ConnectedPlaylist) : null;
  } catch {
    return null;
  }
}
