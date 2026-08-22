import { useEffect, useState } from "react";
import { Loader2, Sparkles, StretchHorizontal } from "lucide-react";
import { OverlayPortal } from "@/lib/overlayPortal";
import { useSession } from "@/store/session";
import { cx } from "@/lib/utils";
import type { Drop, Profile } from "@/types";
import { hideFromVybz, placeOnVybz } from "./placeOnVybz";
import {
  isComposed,
  isOnStage,
  parseStageComposition,
  sectionFor,
  type ProfileSection,
} from "./stageComposition";

const SECTIONS: Array<{ id: ProfileSection; title: string; body: string }> = [
  {
    id: "works",
    title: "Works",
    body: "Lives on your Stage File with the rest of your placed work.",
  },
  {
    id: "featured",
    title: "Featured",
    body: "The pin. Still one file in Library — visitors see it first.",
  },
];

export function PlaceOnVybzSheet({
  open,
  drops,
  snapshotDropIds,
  profile,
  onClose,
  onChanged,
}: {
  open: boolean;
  drops: Drop[];
  snapshotDropIds: string[];
  profile: Profile | null;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const { showToast, refreshProfile } = useSession();
  const [section, setSection] = useState<ProfileSection>("works");
  const [busy, setBusy] = useState<"place" | "hide" | null>(null);

  const composition = parseStageComposition(profile?.profile);
  const composed = isComposed(composition);
  const ids = drops.map((d) => d.id);
  const single = drops.length === 1 ? drops[0] : null;
  const already = composed
    ? single
      ? isOnStage(composition, single.id, profile?.featuredDropId)
      : drops.every((d) => isOnStage(composition, d.id, profile?.featuredDropId))
    : false;
  const currentSection = single
    ? sectionFor(composition, single.id, profile?.featuredDropId)
    : null;

  useEffect(() => {
    if (!open) return;
    setSection(currentSection === "featured" ? "featured" : "works");
  }, [open, currentSection]);

  if (!open || !profile) return null;

  const title = single
    ? single.title?.trim() || "Untitled"
    : `${drops.length} selected`;

  async function place() {
    if (!profile || busy) return;
    setBusy("place");
    const res = await placeOnVybz({
      profile,
      dropIds: ids,
      section,
      snapshotDropIds,
    });
    setBusy(null);
    if (!res.ok) {
      showToast(res.error);
      return;
    }
    await refreshProfile();
    onChanged?.();
    showToast(section === "featured" ? "Featured on your VYBZ" : "On your VYBZ");
    onClose();
  }

  async function hide() {
    if (!profile || busy) return;
    setBusy("hide");
    const res = await hideFromVybz({
      profile,
      dropIds: ids,
      snapshotDropIds,
    });
    setBusy(null);
    if (!res.ok) {
      showToast(res.error);
      return;
    }
    await refreshProfile();
    onChanged?.();
    showToast("Removed from your VYBZ — still in Library");
    onClose();
  }

  return (
    <OverlayPortal>
      <div
        className="fixed inset-0 z-[96] flex items-end justify-center bg-black/65 backdrop-blur-md sm:items-center"
        onClick={onClose}
        data-testid="place-on-vybz"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Place on your VYBZ"
          className="mat-surface-strong w-full max-w-md rounded-t-[1.75rem] border-t border-white/12 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_30px_80px_-24px_rgba(0,0,0,0.9)] sm:rounded-[1.75rem] sm:border"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
            Place on your VYBZ
          </p>
          <h2 className="mt-1 font-display text-[1.35rem] font-semibold leading-tight tracking-tight text-white">
            {title}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-white/50">
            One file. Library keeps it. Your VYBZ only shows what you place.
            {isComposed(composition)
              ? ""
              : " Placing starts composing — new uploads stay private until you place them."}
          </p>

          <div className="mt-4 grid gap-2">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                aria-pressed={section === s.id}
                data-testid={`place-section-${s.id}`}
                className={cx(
                  "rounded-2xl border px-4 py-3 text-left transition active:scale-[0.99]",
                  section === s.id
                    ? "border-cyan-200/35 bg-cyan-950/40"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-white">
                  {s.id === "featured" ? (
                    <Sparkles className="h-4 w-4 text-amber-200" />
                  ) : (
                    <StretchHorizontal className="h-4 w-4 text-cyan-200/80" />
                  )}
                  {s.title}
                  {currentSection === s.id ? (
                    <span className="ml-auto text-[10px] font-medium uppercase tracking-wider text-white/40">
                      Now
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 block text-[12px] leading-relaxed text-white/45">{s.body}</span>
              </button>
            ))}
          </div>

          <div className="mt-5 flex gap-2">
            {already ? (
              <button
                type="button"
                disabled={!!busy}
                onClick={() => void hide()}
                data-testid="place-hide"
                className="btn btn-ghost flex-1"
              >
                {busy === "hide" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
              </button>
            ) : (
              <button type="button" onClick={onClose} className="btn btn-ghost flex-1">
                Not now
              </button>
            )}
            <button
              type="button"
              disabled={!!busy}
              onClick={() => void place()}
              data-testid="place-confirm"
              className="btn btn-primary flex-1"
            >
              {busy === "place" ? <Loader2 className="h-4 w-4 animate-spin" /> : already ? "Update" : "Place"}
            </button>
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}
