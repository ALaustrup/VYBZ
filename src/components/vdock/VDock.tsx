import { useEffect } from "react";
import { DockPlaybackProgress, MusicDockPlayer } from "@/components/GlobalPlayer";
import { DockVisualizer } from "@/components/vdock/DockVisualizer";

/**
 * Music Dock — edge-to-edge bottom bar (full width + safe-area).
 * Fixed chrome height so track changes never resize the layout.
 */
export function VDock(_props: { onCompose: () => void }) {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty(
      "--dock-reserve",
      "calc(var(--vdock-h, 5.25rem) + env(safe-area-inset-bottom, 0px))",
    );
    return () => { root.style.removeProperty("--dock-reserve"); };
  }, []);

  return (
    <div
      className="vdock-shell vdock-forge vdock-ops pointer-events-auto relative flex w-full flex-col overflow-hidden"
      data-vdock
      data-dark-stage
      role="complementary"
      aria-label="Music player"
    >
      <DockVisualizer className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-100" />
      <div className="vdock-shell-veil vdock-forge-veil pointer-events-none absolute inset-0 z-[1]" aria-hidden />
      <DockPlaybackProgress />
      <div className="relative z-10 flex min-h-[var(--vdock-h,5.25rem)] flex-1 items-center px-3 pb-[env(safe-area-inset-bottom,0px)] sm:px-5">
        <MusicDockPlayer />
      </div>
    </div>
  );
}

/** @deprecated Use VDock */
export const Taskbar = VDock;
