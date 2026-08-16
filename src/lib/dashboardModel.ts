import type { ReleaseProject } from "@vybz/domain/releases";
import type { StorefrontOrder } from "@/features/storefront/types";
import type { Drop } from "@/types";

/**
 * Derives the dashboard's at-a-glance figures and action centre from data the
 * account actually holds.
 *
 * Every item below is computed from a stored field. Nothing is a placeholder, and
 * no task is invented to make the surface look busy — an account with nothing
 * outstanding correctly produces an empty list.
 */

export type ActionSeverity = "blocking" | "attention" | "suggestion";

export type ActionItem = {
  id: string;
  severity: ActionSeverity;
  title: string;
  /** Why this matters, in one sentence. */
  detail: string;
  /** Label for the control that resolves it. */
  actionLabel: string;
  href: string;
  count: number;
};

export type DashboardStats = {
  tracks: number;
  releases: number;
  releasesReady: number;
  releasesBlocked: number;
  releasesDraft: number;
  /** Tracks with no downloadable asset row attached. */
  tracksWithoutFile: number;
  /** Tracks still called "Untitled". */
  tracksUntitled: number;
  totalPlays: number;
};

const SEVERITY_RANK: Record<ActionSeverity, number> = {
  blocking: 0,
  attention: 1,
  suggestion: 2,
};

function isUntitled(d: Drop): boolean {
  return !d.title || d.title.trim().length === 0;
}

export function buildStats(drops: Drop[], releases: ReleaseProject[]): DashboardStats {
  const live = releases.filter((r) => r.status !== "archived");
  return {
    tracks: drops.length,
    releases: live.length,
    releasesReady: live.filter((r) => r.status === "ready").length,
    releasesBlocked: live.filter((r) => r.status === "blocked").length,
    releasesDraft: live.filter((r) => r.status === "draft").length,
    tracksWithoutFile: drops.filter((d) => !d.assetId).length,
    tracksUntitled: drops.filter(isUntitled).length,
    totalPlays: drops.reduce((n, d) => n + (d.plays ?? 0), 0),
  };
}

export function buildActionItems({
  drops,
  releases,
  orders,
}: {
  drops: Drop[];
  releases: ReleaseProject[];
  orders: StorefrontOrder[];
}): ActionItem[] {
  const items: ActionItem[] = [];
  const live = releases.filter((r) => r.status !== "archived");

  const blocked = live.filter((r) => r.status === "blocked");
  if (blocked.length > 0) {
    const first = blocked[0]!;
    items.push({
      id: "releases-blocked",
      severity: "blocking",
      count: blocked.length,
      title:
        blocked.length === 1
          ? `“${first.title}” is blocked`
          : `${blocked.length} scans are blocked`,
      detail: "A check found something that will stop a release.",
      actionLabel: blocked.length === 1 ? "Open scan" : "See scans",
      href: blocked.length === 1 ? `/release/${first.id}` : "/releases",
    });
  }

  const drafts = live.filter((r) => r.status === "draft");
  if (drafts.length > 0) {
    const first = drafts[0]!;
    items.push({
      id: "releases-draft",
      severity: "attention",
      count: drafts.length,
      title:
        drafts.length === 1
          ? `“${first.title}” is still a draft`
          : `${drafts.length} scans are still drafts`,
      detail: "Open warnings left. Clear them before you publish.",
      actionLabel: drafts.length === 1 ? "Continue" : "See drafts",
      href: drafts.length === 1 ? `/release/${first.id}` : "/releases",
    });
  }

  const pendingOrders = orders.filter(
    (o) => o.status === "paid" && o.settlement_status !== "settled_off_platform"
  );
  if (pendingOrders.length > 0) {
    items.push({
      id: "orders-pending-settlement",
      severity: "attention",
      count: pendingOrders.length,
      title: `${pendingOrders.length} paid ${pendingOrders.length === 1 ? "order" : "orders"} to pay out`,
      detail: "They paid. Mark settled after you pay yourself out.",
      actionLabel: "Your packs",
      href: "/tools/packs",
    });
  }

  const untitled = drops.filter(isUntitled);
  if (untitled.length > 0) {
    items.push({
      id: "tracks-untitled",
      severity: "attention",
      count: untitled.length,
      title: `${untitled.length} ${untitled.length === 1 ? "track has" : "tracks have"} no title`,
      detail: "Untitled files are hard to find later.",
      actionLabel: "Library",
      href: "/library",
    });
  }

  const noFile = drops.filter((d) => !d.assetId);
  if (noFile.length > 0) {
    items.push({
      id: "tracks-without-file",
      severity: "suggestion",
      count: noFile.length,
      title: `${noFile.length} ${noFile.length === 1 ? "track has" : "tracks have"} no file`,
      detail: "People can play these but cannot download them.",
      actionLabel: "Library",
      href: "/library",
    });
  }

  if (drops.length > 0 && live.length === 0) {
    items.push({
      id: "no-releases",
      severity: "suggestion",
      count: drops.length,
      title: "None of your tracks have been scanned",
      detail: "A scan checks loudness, peaks, art, and names.",
      actionLabel: "Scan a track",
      href: "/releases",
    });
  }

  return items.sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.count - a.count
  );
}

/** Releases the user most recently touched, newest first. */
export function recentReleases(releases: ReleaseProject[], limit = 4): ReleaseProject[] {
  return [...releases]
    .filter((r) => r.status !== "archived")
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, limit);
}

/** The single most useful next step for a release, given only its status. */
export function nextStepFor(release: ReleaseProject): string {
  switch (release.status) {
    case "blocked":
      return "Resolve what's blocking it";
    case "draft":
      return "Review open findings";
    case "scanning":
      return "Scan in progress";
    case "ready":
      return "Package the ZIP";
    default:
      return "Open scan";
  }
}
