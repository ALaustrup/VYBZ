// Turn a shared music link (Spotify / YouTube Music / SoundCloud / Apple Music)
// into an embeddable player src. Returns null for unsupported links.

export interface MusicEmbed {
  src: string;
  height: number;
}

export function musicEmbed(url: string | null | undefined): MusicEmbed | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    if (host.includes("open.spotify.com")) {
      return { src: `https://open.spotify.com/embed${u.pathname}`, height: 152 };
    }
    if (host === "youtu.be") {
      return { src: `https://www.youtube.com/embed/${u.pathname.slice(1)}`, height: 152 };
    }
    if (host.includes("youtube.com") || host.includes("music.youtube.com")) {
      const v = u.searchParams.get("v");
      const list = u.searchParams.get("list");
      if (v) return { src: `https://www.youtube.com/embed/${v}`, height: 152 };
      if (list) return { src: `https://www.youtube.com/embed/videoseries?list=${list}`, height: 152 };
    }
    if (host.includes("soundcloud.com")) {
      return {
        src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%238b4ff2&visual=false&hide_related=true`,
        height: 152,
      };
    }
    if (host.includes("music.apple.com")) {
      return { src: `https://embed.music.apple.com${u.pathname}`, height: 175 };
    }
    return null;
  } catch {
    return null;
  }
}
