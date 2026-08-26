import { useEffect, useState } from "react";
import { DockPlaybackProgress, MusicDockPlayer } from "@/components/GlobalPlayer";
import { VDockSocialStrip } from "@/components/vdock/VDockSocialStrip";
import { DockVisualizer } from "@/components/vdock/DockVisualizer";
import { DockVisualOptions } from "@/components/vdock/DockVisualOptions";

/**
 * V-Dock — social shortcuts + music player. One dock, one AudioBus graph.
 * Fixed chrome height so track changes never resize the layout.
 */
export function VDock({ onCompose }: { onCompose?: () => void }) {
  const [visualsOpen, setVisualsOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty(
      "--dock-reserve",
      "calc(var(--vdock-h, 5.25rem) + var(--vdock-social-h, 2.25rem) + env(safe-area-inset-bottom, 0px))",
    );
    return () => {
      root.style.removeProperty("--dock-reserve");
    };
  }, []);

  return (
    <div
      className="vdock-shell vdock-forge vdock-ops pointer-events-auto relative flex w-full flex-col overflow-hidden"
      data-vdock
      data-dark-stage
      role="complementary"
      aria-label="V-Dock"
    >
      <DockVisualizer className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-100" />
      <button
        type="button"
        onClick={() => setVisualsOpen((v) => !v)}
        aria-label="Dock visuals"
        aria-haspopup="dialog"
        aria-expanded={visualsOpen}
        data-testid="dock-visual-surface"
        className="absolute inset-0 z-[2] cursor-pointer bg-transparent"
      />
      <div className="vdock-shell-veil vdock-forge-veil pointer-events-none absolute inset-0 z-[1]" aria-hidden />
      <VDockSocialStrip onCompose={onCompose} />
      <DockPlaybackProgress />
      <DockVisualOptions open={visualsOpen} onClose={() => setVisualsOpen(false)} />
      <div className="relative z-10 flex min-h-[var(--vdock-h,5.25rem)] flex-1 items-center px-3 pb-[env(safe-area-inset-bottom,0px)] sm:px-5">
        <MusicDockPlayer />
      </div>
    </div>
  );
}

/** @deprecated Use VDock */
export const Taskbar = VDock;
