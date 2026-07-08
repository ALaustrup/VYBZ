import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { EyeOff, ShieldAlert, X } from "lucide-react";
import { useApp } from "@/store/AppStore";
import { CONFESSIONS, OWN_CONFESSIONS } from "@/data/confessions";
import type { Confession } from "@/types";

/**
 * Fitted, resizable media viewer. Opens on a single tap of a post's media and
 * shows the full photo or video — letterboxed (object-fit: contain) so nothing
 * is cropped — inside a window the user can drag to reposition and resize from
 * the corner (desktop). On phones it fills the viewport, fitted. NSFW-marked
 * media shows a small tag in the corner.
 */
export function MediaViewer() {
  const { mediaViewerId, closeMedia, backendConfessions, userConfessions, account } =
    useApp();
  const dragControls = useDragControls();
  const videoRef = useRef<HTMLVideoElement>(null);
  // Best-effort screen-capture deterrent: black out full-screen media whenever
  // the page is hidden or loses focus (some capture flows trigger this). This
  // cannot defeat a determined OS-level recorder — the open web has no API for
  // that without DRM — but it removes the easiest capture paths.
  const [obscured, setObscured] = useState(false);
  useEffect(() => {
    const hide = () => setObscured(true);
    const show = () => setObscured(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", show);
    window.addEventListener("blur", hide);
    window.addEventListener("focus", show);
    return () => {
      document.removeEventListener("visibilitychange", show);
      window.removeEventListener("blur", hide);
      window.removeEventListener("focus", show);
    };
  }, []);

  const confession: Confession | undefined = useMemo(() => {
    if (!mediaViewerId) return undefined;
    return (
      [
        ...backendConfessions,
        ...userConfessions,
        ...CONFESSIONS,
        ...OWN_CONFESSIONS,
      ].find((c) => c.id === mediaViewerId) ?? undefined
    );
  }, [mediaViewerId, backendConfessions, userConfessions]);

  const hasMedia = !!confession?.photo;
  const isVideo = confession?.mediaKind === "video";

  return (
    <AnimatePresence>
      {confession && hasMedia && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMedia}
            className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            drag
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            className="fixed left-1/2 top-1/2 z-[71] flex max-h-[92vh] max-w-[96vw] flex-col overflow-hidden rounded-2xl border border-white/15 bg-ink-900 shadow-2xl"
            style={{
              x: "-50%",
              y: "-50%",
              // Fitted by default; the corner grip resizes on desktop.
              width: "min(96vw, 880px)",
              height: "min(82vh, 660px)",
              resize: "both",
              minWidth: 240,
              minHeight: 200,
            }}
          >
            {/* Title bar — drag to move; holds the NSFW tag + close. */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="flex shrink-0 cursor-grab touch-none items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-2 active:cursor-grabbing"
            >
              <div className="flex items-center gap-2">
                {confession.nsfw && (
                  <span className="flex items-center gap-1 rounded-full bg-wild/85 px-2 py-0.5 text-[10px] font-bold text-white">
                    <ShieldAlert className="h-3 w-3" /> NSFW
                  </span>
                )}
                <span className="text-xs font-medium text-white/45">
                  {isVideo ? "Video" : "Photo"}
                </span>
              </div>
              <button
                onClick={closeMedia}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full glass active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Media — letterboxed so the full upload is always visible. */}
            <div
              className="relative min-h-0 flex-1 bg-black"
              data-protect-media
              onContextMenu={(e) => e.preventDefault()}
            >
              {isVideo ? (
                <video
                  ref={videoRef}
                  src={confession.photo as string}
                  controls
                  autoPlay
                  loop
                  playsInline
                  preload="auto"
                  disablePictureInPicture
                  controlsList="nodownload noremoteplayback noplaybackrate"
                  onContextMenu={(e) => e.preventDefault()}
                  className="absolute inset-0 h-full w-full"
                  style={{ objectFit: "contain", backgroundColor: "#000" }}
                />
              ) : (
                <img
                  src={confession.photo as string}
                  alt="Post media"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  className="absolute inset-0 h-full w-full select-none"
                  style={{ objectFit: "contain" }}
                />
              )}
              {/* Per-view watermark — faintly stamps the viewer's identity across
                  the media so screenshots/recordings are traceable and deterred. */}
              {account?.username && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-[5] overflow-hidden opacity-[0.10] mix-blend-overlay"
                  style={{ transform: "rotate(-24deg) scale(1.4)" }}
                >
                  <div className="flex flex-col gap-10">
                    {Array.from({ length: 9 }).map((_, row) => (
                      <div
                        key={row}
                        className="flex shrink-0 gap-10 whitespace-nowrap text-sm font-bold tracking-widest text-white"
                        style={{ marginLeft: row % 2 ? "-3rem" : "0" }}
                      >
                        {Array.from({ length: 6 }).map((__, col) => (
                          <span key={col}>VYBZ · {account.username}</span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Capture deterrent overlay. */}
              {obscured && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black text-white/50">
                  <EyeOff className="h-6 w-6" />
                  <span className="text-xs font-medium">Protected content</span>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
