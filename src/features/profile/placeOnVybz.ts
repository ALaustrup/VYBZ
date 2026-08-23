import * as api from "@/lib/api";
import type { Profile, ProfileDetails } from "@/types";
import {
  hideDrops,
  parseStageComposition,
  placeDrops,
  type ProfileSection,
  type StageComposition,
} from "./stageComposition";
import { parseStageModuleOrder } from "./stageLayout";

export async function persistStageComposition(
  details: ProfileDetails,
  next: StageComposition,
): Promise<{ error?: string }> {
  return api.updateMyProfile({ profile: { ...details, stageComposition: next } });
}

export async function persistStageModuleOrder(
  details: ProfileDetails,
  order: string[],
): Promise<{ error?: string }> {
  return api.updateMyProfile({
    profile: { ...details, stageModuleOrder: parseStageModuleOrder(order) },
  });
}

export async function placeOnVybz(input: {
  profile: Profile;
  dropIds: string[];
  section: ProfileSection;
  snapshotDropIds: string[];
}): Promise<{ ok: true; composition: StageComposition } | { ok: false; error: string }> {
  const current = parseStageComposition(input.profile.profile);
  const next = placeDrops(current, input.dropIds, input.section, input.snapshotDropIds);
  if (input.section === "featured" && input.dropIds[0]) {
    const pinned = await api.setFeaturedDrop(input.dropIds[0]);
    if (!pinned) return { ok: false, error: "Could not pin as featured" };
  } else if (input.section === "works") {
    const pinned = input.profile.featuredDropId;
    if (pinned && input.dropIds.includes(pinned)) {
      const cleared = await api.setFeaturedDrop(null);
      if (!cleared) return { ok: false, error: "Could not clear the featured pin" };
    }
  }
  const saved = await persistStageComposition(input.profile.profile ?? {}, next);
  if (saved.error) return { ok: false, error: saved.error };
  return { ok: true, composition: next };
}

export async function hideFromVybz(input: {
  profile: Profile;
  dropIds: string[];
  snapshotDropIds: string[];
}): Promise<{ ok: true; composition: StageComposition } | { ok: false; error: string }> {
  const current = parseStageComposition(input.profile.profile);
  const next = hideDrops(current, input.dropIds, input.snapshotDropIds);
  if (input.profile.featuredDropId && input.dropIds.includes(input.profile.featuredDropId)) {
    const cleared = await api.setFeaturedDrop(null);
    if (!cleared) return { ok: false, error: "Could not clear the featured pin" };
  }
  const saved = await persistStageComposition(input.profile.profile ?? {}, next);
  if (saved.error) return { ok: false, error: saved.error };
  return { ok: true, composition: next };
}
