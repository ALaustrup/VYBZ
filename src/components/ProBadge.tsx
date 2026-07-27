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
  discoverFilterHint: "Pro soft-filters denser discovery presets when available.",
  uploadSoftLimitMb: 80,
  freeUploadSoftLimitMb: 40,
} as const;

/** Soft upload ceiling in bytes — warn above this, never block the upload. */
export function softUploadLimitBytes(profile?: ProfileDetails | null): number {
  const mb = isPro(profile) ? PRO_SOFT.uploadSoftLimitMb : PRO_SOFT.freeUploadSoftLimitMb;
  return mb * 1024 * 1024;
}

/** Human hint when a file exceeds the soft ceiling (upload still proceeds). */
export function softUploadHint(fileBytes: number, profile?: ProfileDetails | null): string | null {
  if (!FLAGS.pro) return null;
  const limit = softUploadLimitBytes(profile);
  if (fileBytes <= limit) return null;
  const mb = Math.round(fileBytes / (1024 * 1024));
  const softMb = isPro(profile) ? PRO_SOFT.uploadSoftLimitMb : PRO_SOFT.freeUploadSoftLimitMb;
  if (isPro(profile)) {
    return `${mb} MB is above the Pro soft hint (${softMb} MB) — upload continues; large files may take longer.`;
  }
  return `${mb} MB is above the free soft hint (${softMb} MB) — upload continues. Pro raises the soft hint to ${PRO_SOFT.uploadSoftLimitMb} MB (never a hard lock).`;
}
