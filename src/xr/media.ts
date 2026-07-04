// MYVYB XR — card media loader.
//
// Turns a post's uploaded photo/video into a Three.js texture for its in-world
// panel: images via TextureLoader, videos via a muted, looping VideoTexture that
// honours the post's non-destructive trim window. Everything is disposable and
// defensive — a CORS failure or unplayable file simply keeps the text fallback.

import * as THREE from "three";

export interface CardMedia {
  texture: THREE.Texture;
  isVideo: boolean;
  video: HTMLVideoElement | null;
  /** width / height once known (default 4:3 until an image/video reports it). */
  aspect: number;
  play: () => void;
  pause: () => void;
  dispose: () => void;
}

export interface MediaInput {
  photo?: string;
  mediaKind?: "image" | "video";
  clipStart?: number;
  clipEnd?: number;
}

const DEFAULT_ASPECT = 4 / 3;

/**
 * Build a CardMedia for a post. `fallback` is the already-painted text texture,
 * returned as-is when the post has no media (or media fails to load).
 */
export function loadCardMedia(
  input: MediaInput,
  fallback: THREE.Texture,
  anisotropy: number,
  onReady?: (media: CardMedia) => void
): CardMedia {
  const noMedia = (): CardMedia => ({
    texture: fallback,
    isVideo: false,
    video: null,
    aspect: DEFAULT_ASPECT,
    play: () => {},
    pause: () => {},
    dispose: () => {},
  });

  if (!input.photo) return noMedia();

  // ---- Video -------------------------------------------------------------
  if (input.mediaKind === "video") {
    try {
      const video = document.createElement("video");
      video.src = input.photo;
      video.crossOrigin = "anonymous";
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      (video as HTMLVideoElement & { disableRemotePlayback?: boolean }).disableRemotePlayback = true;

      const start = Math.max(0, input.clipStart ?? 0);
      const end = input.clipEnd && input.clipEnd > start ? input.clipEnd : undefined;

      const texture = new THREE.VideoTexture(video);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      const media: CardMedia = {
        texture,
        isVideo: true,
        video,
        aspect: DEFAULT_ASPECT,
        play: () => {
          void video.play().catch(() => {});
        },
        pause: () => {
          try {
            video.pause();
          } catch {
            /* ignore */
          }
        },
        dispose: () => {
          try {
            video.pause();
            video.removeAttribute("src");
            video.load();
          } catch {
            /* ignore */
          }
          texture.dispose();
        },
      };

      video.addEventListener("loadedmetadata", () => {
        if (video.videoWidth && video.videoHeight) {
          media.aspect = video.videoWidth / video.videoHeight;
        }
        if (start > 0) {
          try {
            video.currentTime = start;
          } catch {
            /* ignore */
          }
        }
        onReady?.(media);
      });
      // Enforce the trim window without a destructive re-encode.
      video.addEventListener("timeupdate", () => {
        if (end !== undefined && video.currentTime >= end) {
          try {
            video.currentTime = start;
          } catch {
            /* ignore */
          }
        }
      });
      return media;
    } catch {
      return noMedia();
    }
  }

  // ---- Image -------------------------------------------------------------
  try {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    let disposed = false;
    const media: CardMedia = {
      texture: fallback,
      isVideo: false,
      video: null,
      aspect: DEFAULT_ASPECT,
      play: () => {},
      pause: () => {},
      dispose: () => {
        disposed = true;
        if (media.texture !== fallback) media.texture.dispose();
      },
    };
    loader.load(
      input.photo,
      (tex) => {
        if (disposed) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = anisotropy;
        const img = tex.image as { width?: number; height?: number } | undefined;
        if (img?.width && img?.height) media.aspect = img.width / img.height;
        media.texture = tex;
        onReady?.(media);
      },
      undefined,
      () => {
        /* keep the text fallback on error */
      }
    );
    return media;
  } catch {
    return noMedia();
  }
}
