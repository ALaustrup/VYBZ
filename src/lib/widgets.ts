// ---------------------------------------------------------------------------
// Project widgets — pluggable cards that surface data from external sources.
//
// Two tiers:
//  • Embed widgets: paste a public URL → a live embed (Spotify/YouTube/SoundCloud/
//    Apple Music) or a link card (anything else). No keys, works now.
//  • Connectors (gated): OAuth account integrations that pull analytics
//    (Spotify for Artists, Facebook Page, TikTok). These need provider API
//    credentials + an OAuth flow, so they're shown but disabled until wired.
// ---------------------------------------------------------------------------

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
  { id: "spotify", label: "Spotify", embed: true, placeholder: "Spotify track / album / artist / playlist URL" },
  { id: "youtube", label: "YouTube", embed: true, placeholder: "YouTube video or playlist URL" },
  { id: "soundcloud", label: "SoundCloud", embed: true, placeholder: "SoundCloud track or playlist URL" },
  { id: "apple_music", label: "Apple Music", embed: true, placeholder: "Apple Music song / album URL" },
  { id: "bandcamp", label: "Bandcamp", embed: true, placeholder: "Bandcamp album / track URL" },
  { id: "link", label: "Website / Link", embed: true, placeholder: "Any URL — TikTok, Instagram, your site…" },
  // ── Gated OAuth connectors (need provider API credentials) ──
  { id: "spotify_artist", label: "Spotify for Artists", embed: false, gated: true, hint: "Live stream/listener stats" },
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
      // open.spotify.com/<type>/<id> → open.spotify.com/embed/<type>/<id>
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
    // bandcamp / link → link card (bandcamp needs album/track ids not in the URL)
    return null;
  } catch {
    return null;
  }
}

/** Suggested iframe height per embed kind. */
export function embedHeight(kind: string, src: string): number {
  if (kind === "spotify") return /\/(artist|album|playlist|show)\//.test(src) ? 352 : 152;
  if (kind === "youtube") return 200;
  if (kind === "soundcloud") return 166;
  if (kind === "apple_music") return 175;
  return 180;
}
