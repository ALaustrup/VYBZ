// ---------------------------------------------------------------------------
// Project widgets — pluggable cards that surface data from external sources.
//
// Two tiers:
//  • Embed widgets: paste a public URL → a live embed (Spotify/YouTube/SoundCloud/
//    Apple Music) or a link card (anything else). No keys, works now.
//  • Connectors: OAuth account integrations. Spotify unlocks when
//    VITE_FEATURE_OAUTH_SPOTIFY=on; Facebook/TikTok stay gated until credentials.
// ---------------------------------------------------------------------------

import { FLAGS } from "@/lib/flags";

export interface WidgetKind {
  id: string;
  label: string;
  /** Embed widgets take a URL; connectors are OAuth (gated). */
  embed: boolean;
  /** Gated on external API credentials — shown but not yet connectable. */
  gated?: boolean;
  placeholder?: string;
  hint?: string;
}

export const WIDGET_KINDS: WidgetKind[] = [
  // Music
  { id: "spotify", label: "Spotify", embed: true, placeholder: "Spotify track / album / artist / playlist URL" },
  { id: "soundcloud", label: "SoundCloud", embed: true, placeholder: "SoundCloud track or playlist URL" },
  { id: "bandcamp", label: "Bandcamp", embed: true, placeholder: "Bandcamp album / track URL" },
  { id: "apple_music", label: "Apple Music", embed: true, placeholder: "Apple Music song / album URL" },
  // Video
  { id: "youtube", label: "YouTube", embed: true, placeholder: "YouTube video or playlist URL" },
  { id: "vimeo", label: "Vimeo", embed: true, placeholder: "Vimeo video URL" },
  // Visual art
  { id: "artstation", label: "ArtStation", embed: true, placeholder: "ArtStation profile / artwork URL" },
  { id: "behance", label: "Behance", embed: true, placeholder: "Behance profile / project URL" },
  // Games
  { id: "steam", label: "Steam", embed: true, placeholder: "Steam store page URL (store.steampowered.com/app/…)" },
  { id: "itch", label: "itch.io", embed: true, placeholder: "itch.io game URL (playable page)" },
  // Universal
  { id: "link", label: "Website / Link", embed: true, placeholder: "Any URL — TikTok, Instagram, your site…" },
  // ── OAuth connectors ──
  {
    id: "spotify_artist",
    label: "Spotify for Artists",
    embed: false,
    gated: !FLAGS.oauthSpotify,
    hint: "Live stream/listener stats",
  },
  { id: "facebook_page", label: "Facebook Page", embed: false, gated: true, hint: "Page insights & reach" },
  { id: "tiktok", label: "TikTok Analytics", embed: false, gated: true, hint: "Views & follower growth" },
];

export const WIDGET_LABEL: Record<string, string> = Object.fromEntries(WIDGET_KINDS.map((w) => [w.id, w.label]));

/**
 * Build an embeddable iframe src for a pasted URL, or null to fall back to a
 * link card. Purely string transforms on public URLs — no network.
 */
export function embedSrc(kind: string, url: string | undefined): string | null {
  if (!url) return null;
  const u = url.trim();
  try {
    if (kind === "spotify") {
      const m = u.match(/open\.spotify\.com\/(intl-[a-z]+\/)?(track|album|artist|playlist|show|episode)\/([A-Za-z0-9]+)/);
      if (m) return `https://open.spotify.com/embed/${m[2]}/${m[3]}`;
      const uri = u.match(/spotify:(track|album|artist|playlist|show|episode):([A-Za-z0-9]+)/);
      if (uri) return `https://open.spotify.com/embed/${uri[1]}/${uri[2]}`;
      return null;
    }
    if (kind === "youtube") {
      const v = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
      if (v) return `https://www.youtube.com/embed/${v[1]}`;
      const list = u.match(/[?&]list=([A-Za-z0-9_-]+)/);
      if (list) return `https://www.youtube.com/embed/videoseries?list=${list[1]}`;
      return null;
    }
    if (kind === "soundcloud") {
      if (!/soundcloud\.com/.test(u)) return null;
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(u)}&color=%23a87cf8&auto_play=false&show_comments=false`;
    }
    if (kind === "apple_music") {
      if (!/music\.apple\.com/.test(u)) return null;
      return u.replace("music.apple.com", "embed.music.apple.com");
    }
    if (kind === "vimeo") {
      const m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      if (m) return `https://player.vimeo.com/video/${m[1]}`;
      return null;
    }
    if (kind === "steam") {
      const m = u.match(/store\.steampowered\.com\/app\/(\d+)/);
      if (m) return `https://store.steampowered.com/widget/${m[1]}/`;
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

/** Suggested iframe height per embed kind. */
export function embedHeight(kind: string, src: string): number {
  if (kind === "spotify") return /\/(artist|album|playlist|show)\//.test(src) ? 352 : 152;
  if (kind === "youtube" || kind === "vimeo") return 200;
  if (kind === "soundcloud") return 166;
  if (kind === "apple_music") return 175;
  if (kind === "steam") return 190;
  return 180;
}
