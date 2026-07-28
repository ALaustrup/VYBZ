import { useEffect } from "react";
import { DockPlaybackProgress, MusicDockPlayer } from "@/components/GlobalPlayer";
import { DockVisualizer } from "@/components/vdock/DockVisualizer";

/**
 * Music Dock — full-bleed Now Playing with glass visualizer.
 * Side pins removed; navigation lives on Living Home Pulse + More drawer.
 */
export function VDock(_props: { onCompose: () => void }) {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--dock-reserve", "5.75rem");
    return () => { root.style.removeProperty("--dock-reserve"); };
  }, []);

  return (
    <div className="pointer-events-none relative mx-auto flex w-full max-w-3xl overflow-visible px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] sm:px-3">
      <div
        className="pointer-events-auto relative flex w-full flex-col overflow-hidden rounded-[1.35rem] border border-white/14 shadow-[0_18px_50px_-24px_rgba(6,12,28,0.55)]"
        style={{
          background: "rgba(14, 18, 32, 0.42)",
          backdropFilter: "blur(28px) saturate(1.6)",
          WebkitBackdropFilter: "blur(28px) saturate(1.6)",
        }}
        data-vdock
        data-dark-stage
        role="complementary"
        aria-label="Music player"
      >
        <DockVisualizer className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-90" />
        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,14,24,0.15) 0%, rgba(10,14,24,0.45) 100%)",
          }}
        />
        <DockPlaybackProgress />
        <div className="relative z-10 px-2 py-1.5 sm:px-3 sm:py-2">
          <MusicDockPlayer />
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use VDock */
export const Taskbar = VDock;
