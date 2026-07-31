import { useEffect, useRef, useState } from "react";
import { Check, Film, GraduationCap, Plus, Trash2, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VDOCK_VISUALS, type VdockVisual } from "@/lib/vdockVisualManifest";
import { cx } from "@/lib/utils";

const BACKDROP_ACCEPT = "video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/webp";

/**
 * Horizontal Vizualz carousel + custom upload for drop playback visuals.
 */
export function VisualPicker({
  selectedId,
  customPreview,
  customIsVideo,
  backdropFit,
  backdropDim,
  onSelectCatalog,
  onCustomFile,
  onClearCustom,
  onFitChange,
  onDimChange,
  tutorialHref = "/visuals/tutorial",
  onBeforeTutorial,
}: {
  selectedId: string | null;
  customPreview: string | null;
  customIsVideo?: boolean;
  backdropFit: "cover" | "contain";
  backdropDim: number;
  onSelectCatalog: (id: string | null) => void;
  onCustomFile: (file: File) => void;
  onClearCustom: () => void;
  onFitChange: (fit: "cover" | "contain") => void;
  onDimChange: (dim: number) => void;
  tutorialHref?: string;
  /** Close sheets / overlays before navigating to the tutorial. */
  onBeforeTutorial?: () => void;
}) {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onCustomFile(file);
  }

  function openTutorial() {
    onBeforeTutorial?.();
    navigate(tutorialHref);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-white/70">
            <Film className="h-3.5 w-3.5 text-suite-cyan/80" /> VDock visual
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-white/40">
            Pick a Vizualz loop for the music bar, or upload your own. Swipe the row to browse.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={() => {
              onBeforeTutorial?.();
              navigate("/visuals/studio?tab=generate");
            }}
            className="inline-flex items-center gap-1 rounded-full border border-suite-cyan/30 bg-suite-cyan/10 px-2.5 py-1 text-[10px] font-semibold text-suite-cyan/90 transition hover:border-suite-cyan/50 hover:bg-suite-cyan/20"
          >
            AI generate · 2 Vc
          </button>
          <button
            type="button"
            onClick={openTutorial}
            className="inline-flex items-center gap-1 rounded-full border border-white/14 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold text-white/80 transition hover:border-suite-cyan/35 hover:text-white"
          >
            <GraduationCap className="h-3 w-3" /> Make yours · +10 Vc
          </button>
          <button
            type="button"
            onClick={() => {
              onBeforeTutorial?.();
              navigate("/visuals/studio");
            }}
            className="inline-flex items-center gap-1 rounded-full border border-white/14 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold text-white/80 transition hover:border-suite-cyan/35 hover:text-white"
          >
            Open studio
          </button>
        </div>
      </div>

      <div
        className="no-scrollbar -mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1"
        role="listbox"
        aria-label="Vizualz visuals"
      >
        <button
          type="button"
          role="option"
          aria-selected={!selectedId && !customPreview}
          onClick={() => {
            onClearCustom();
            onSelectCatalog(null);
          }}
          className={cx(
            "flex h-[4.5rem] w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-xl border text-[10px] font-medium transition",
            !selectedId && !customPreview
              ? "border-suite-cyan/50 bg-suite-cyan/15 text-snow"
              : "border-white/12 bg-white/[0.04] text-white/50 hover:border-white/25 hover:text-white/80",
          )}
        >
          Bars only
        </button>

        {VDOCK_VISUALS.map((v) => (
          <VisualThumb
            key={v.id}
            visual={v}
            selected={selectedId === v.id && !customPreview}
            preview={hoverId === v.id}
            onHover={setHoverId}
            onSelect={() => {
              onClearCustom();
              onSelectCatalog(v.id);
            }}
          />
        ))}

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={cx(
            "flex h-[4.5rem] w-[4.5rem] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-[10px] font-medium transition",
            customPreview
              ? "border-[rgb(var(--neon-mint)/0.5)] bg-[rgb(var(--neon-mint)/0.12)] text-[rgb(var(--neon-mint))]"
              : "border-white/20 bg-white/[0.03] text-white/55 hover:border-suite-cyan/40 hover:text-white/85",
          )}
        >
          <Upload className="h-4 w-4" />
          Custom
        </button>
      </div>

      <input ref={fileRef} type="file" accept={BACKDROP_ACCEPT} className="hidden" onChange={pickFile} />

      {customPreview ? (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="relative aspect-[16/5] bg-ink-950">
            {customIsVideo ? (
              <video
                src={customPreview}
                muted
                loop
                playsInline
                autoPlay
                className={cx(
                  "absolute inset-0 h-full w-full",
                  backdropFit === "contain" ? "object-contain" : "object-cover",
                )}
              />
            ) : (
              <img
                src={customPreview}
                alt=""
                className={cx(
                  "absolute inset-0 h-full w-full",
                  backdropFit === "contain" ? "object-contain" : "object-cover",
                )}
              />
            )}
            <div className="pointer-events-none absolute inset-0" style={{ background: `rgba(6,8,16,${backdropDim})` }} />
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white/85">
              <Check className="h-3 w-3 text-suite-cyan" /> Your visual
            </span>
          </div>
          <div className="flex items-center gap-2 border-t border-white/10 px-2.5 py-2">
            <button
              type="button"
              onClick={() => onFitChange("cover")}
              className={cx(
                "rounded-full px-2.5 py-1 text-[11px] font-medium",
                backdropFit === "cover" ? "bg-suite-cyan/25 text-snow ring-1 ring-suite-cyan/40" : "text-white/50",
              )}
            >
              Cover
            </button>
            <button
              type="button"
              onClick={() => onFitChange("contain")}
              className={cx(
                "rounded-full px-2.5 py-1 text-[11px] font-medium",
                backdropFit === "contain" ? "bg-suite-cyan/25 text-snow ring-1 ring-suite-cyan/40" : "text-white/50",
              )}
            >
              Fit
            </button>
            <label className="ml-auto flex items-center gap-2 text-[11px] text-white/45">
              Dim
              <input
                type="range"
                min={0}
                max={70}
                value={Math.round(backdropDim * 100)}
                onChange={(e) => onDimChange(Number(e.target.value) / 100)}
                className="h-1.5 w-20 accent-suite-cyan"
              />
            </label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-full p-1.5 text-white/45 hover:text-white"
              aria-label="Replace visual"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onClearCustom}
              className="rounded-full p-1.5 text-white/45 hover:text-white"
              aria-label="Remove visual"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-white/35">
          Specs: landscape loop · max 1280px wide · 8–12s · MP4/WebM or JPG/PNG/WebP.{" "}
          <button type="button" onClick={openTutorial} className="text-suite-cyan/80/80 underline-offset-2 hover:underline">
            Open guided tutorial
          </button>
        </p>
      )}
    </div>
  );
}

function VisualThumb({
  visual,
  selected,
  preview,
  onHover,
  onSelect,
}: {
  visual: VdockVisual;
  selected: boolean;
  preview: boolean;
  onHover: (id: string | null) => void;
  onSelect: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (preview || selected) {
      void el.play().catch(() => undefined);
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }, [preview, selected]);

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      aria-label={visual.title}
      onClick={onSelect}
      onMouseEnter={() => onHover(visual.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(visual.id)}
      onBlur={() => onHover(null)}
      className={cx(
        "relative h-[4.5rem] w-[7.25rem] shrink-0 overflow-hidden rounded-xl border transition",
        selected
          ? "border-suite-cyan/55 ring-2 ring-suite-cyan/35"
          : "border-white/12 hover:border-white/30",
      )}
    >
      <img
        src={visual.previewUrl}
        alt=""
        className={cx("absolute inset-0 h-full w-full object-cover transition", (preview || selected) && "opacity-0")}
      />
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload="metadata"
        poster={visual.previewUrl}
        className={cx(
          "absolute inset-0 h-full w-full object-cover transition",
          preview || selected ? "opacity-100" : "opacity-0",
        )}
      >
        <source src={visual.loopWebm} type="video/webm" />
        <source src={visual.loopMp4} type="video/mp4" />
      </video>
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-1.5 pb-1 pt-4 text-left text-[9px] font-semibold text-white/90">
        {visual.title}
      </span>
      {selected && (
        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-suite-cyan text-ink-950">
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}
