import { useSyncExternalStore } from "react";
import { AudioWaveform } from "lucide-react";
import {
  cycleVdockVizMode,
  getVdockVizMode,
  setVdockVizMode,
  subscribeVdockVizMode,
  VDOCK_VIZ_MODES,
  vdockVizLabel,
  type VdockVizMode,
} from "@/lib/vdockVizMode";
import { cx } from "@/lib/utils";

function useVizMode(): VdockVizMode {
  return useSyncExternalStore(subscribeVdockVizMode, getVdockVizMode, getVdockVizMode);
}

/** Compact cycle control for the dock action row. */
export function VizModeCycleButton({ className }: { className?: string }) {
  const mode = useVizMode();
  return (
    <button
      type="button"
      onClick={() => cycleVdockVizMode()}
      data-tip={`Visualizer: ${vdockVizLabel(mode)}`}
      aria-label={`Visualizer mode: ${vdockVizLabel(mode)}. Click to change.`}
      className={cx(
        "vdock-action flex h-9 w-9 items-center justify-center rounded-xl text-white/80 transition hover:bg-white/10 hover:text-cyan-100 active:scale-90 sm:h-10 sm:w-10",
        className,
      )}
    >
      <AudioWaveform className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2.1} />
    </button>
  );
}

/** Full selector row (expanded player / settings strip). */
export function VizModeSelector({ className }: { className?: string }) {
  const mode = useVizMode();
  return (
    <div className={cx("flex flex-wrap items-center gap-1.5", className)} role="group" aria-label="Visualizer mode">
      {VDOCK_VIZ_MODES.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setVdockVizMode(m)}
          aria-pressed={mode === m}
          className={cx(
            "rounded-lg px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition",
            mode === m
              ? "bg-white/15 text-white ring-1 ring-white/25"
              : "bg-white/[0.04] text-white/45 hover:text-white/80",
          )}
        >
          {vdockVizLabel(m)}
        </button>
      ))}
    </div>
  );
}
