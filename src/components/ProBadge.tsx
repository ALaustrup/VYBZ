import { FLAGS } from "@/lib/flags";
import type { ProfileDetails } from "@/types";

/** Soft Pro badge — display only; never gates core features. */
export function ProBadge({ profile }: { profile?: ProfileDetails | null }) {
  if (!FLAGS.pro || !isPro(profile)) return null;
  return (
    <span className="rounded-md bg-veil-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-veil-100 ring-1 ring-veil-400/30">
      Pro
    </span>
  );
}

export function isPro(profile?: ProfileDetails | null): boolean {
  if (!profile) return false;
  if (profile.pro === true) return true;
  if (profile.proUntil) {
    const t = Date.parse(profile.proUntil);
    return Number.isFinite(t) && t > Date.now();
  }
  return false;
}

/** Soft bump constants for Pro (hints / limits — not hard locks). */
export const PRO_SOFT = {
  discoverFilterHint: "Pro unlocks denser filter presets — coming soon.",
  uploadSoftLimitMb: 80,
  freeUploadSoftLimitMb: 40,
} as const;
