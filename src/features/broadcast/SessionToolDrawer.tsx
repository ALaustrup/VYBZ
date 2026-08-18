/**
 * In-session drawer: existing desks stay in the tree and stay reachable.
 * This only surfaces them beside the live stage. It does not package audio.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Download, Package, Sliders, Wrench } from "lucide-react";
import { SessionProvenanceBadge } from "@/features/provenance/SessionProvenanceBadge";
import { StoredRecapBind } from "@/features/provenance/StoredRecapBind";
import type { StoredAudioBind } from "@/features/provenance/audioBind";
import type { ProvenanceStrength } from "@/product/invariants";
import { cx } from "@/lib/utils";

const DESKS = [
  { href: "/tools/correct", title: "Fix", hint: "Correction desks" },
  { href: "/tools/stems", title: "Stems", hint: "Split the mix" },
  { href: "/tools/midi", title: "MIDI", hint: "Extract notes" },
  { href: "/tools/translate", title: "Listen check", hint: "Car / club" },
  { href: "/tools/pack-maker", title: "Pack", hint: "Measure a ZIP" },
] as const;

type SessionToolDrawerProps = {
  sessionId: string;
  sessionTitle: string | null;
  ended: boolean;
  provenanceStrength?: ProvenanceStrength | null;
  onDownloadProvenance?: () => void;
  canBindStoredAudio?: boolean;
  storedAudio?: StoredAudioBind | null;
  onStoredAudio?: (next: StoredAudioBind) => void;
};

export function SessionToolDrawer({
  sessionId,
  sessionTitle,
  ended,
  provenanceStrength,
  onDownloadProvenance,
  canBindStoredAudio,
  storedAudio,
  onStoredAudio,
}: SessionToolDrawerProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(ended);

  return (
    <div className="border-t border-[var(--hairline)] bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/60">
          <Wrench className="h-3.5 w-3.5 text-cyan-300" /> Session desks
        </span>
        <ChevronDown className={cx("h-3.5 w-3.5 text-white/35 transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="grid grid-cols-2 gap-2 px-3 pb-3">
          {DESKS.map((desk) => (
            <button
              key={desk.href}
              type="button"
              onClick={() => navigate(desk.href)}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left hover:border-white/20"
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <Sliders className="h-3 w-3 text-white/40" /> {desk.title}
              </span>
              <span className="mt-0.5 block text-[10px] text-white/40">{desk.hint}</span>
            </button>
          ))}
        </div>
      )}

      {ended && provenanceStrength && (
        <div className="border-t border-white/5 px-3 py-3 space-y-2">
          <SessionProvenanceBadge strength={provenanceStrength} />
          <p className="text-[11px] text-white/40">
            Records the live session. Does not prove the music was not AI-generated.
          </p>
          {canBindStoredAudio && onStoredAudio && (
            <StoredRecapBind
              liveSessionId={sessionId}
              current={storedAudio}
              onBound={onStoredAudio}
            />
          )}
          {onDownloadProvenance && (
            <button
              type="button"
              onClick={onDownloadProvenance}
              className="btn btn-ghost flex h-9 w-full items-center justify-center gap-1.5 py-0 text-xs"
            >
              <Download className="h-3.5 w-3.5" /> Download .vprov
            </button>
          )}
        </div>
      )}

      {ended && (
        <div className="border-t border-white/5 px-3 py-3">
          <p className="mb-2 text-[11px] text-white/40">
            This session is over. Pack Maker still needs you to drop the recorded stems — nothing is auto-assembled.
          </p>
          <button
            type="button"
            onClick={() => {
              const q = new URLSearchParams({
                from: "live",
                session: sessionId,
              });
              if (sessionTitle) q.set("title", sessionTitle);
              navigate(`/tools/pack-maker?${q.toString()}`);
            }}
            className="btn btn-primary flex h-9 w-full items-center justify-center gap-1.5 py-0 text-xs"
          >
            <Package className="h-3.5 w-3.5" /> Open Pack Maker
          </button>
        </div>
      )}
    </div>
  );
}
