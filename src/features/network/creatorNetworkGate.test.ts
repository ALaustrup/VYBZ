import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CREATOR_NETWORK, GATE_REGISTRY, ARTIST_STAGE_PROFILE } from "@/product/invariants";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("creator network", () => {
  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("creatorNetwork");
  });

  it("reuses VYB, Follow, live discovery, messaging, and activity without vanity counts", () => {
    expect(CREATOR_NETWORK.vybIsWorkAcknowledgment).toBe(true);
    expect(CREATOR_NETWORK.followIsUnidirectional).toBe(true);
    expect(CREATOR_NETWORK.followIsNotConnect).toBe(true);
    expect(CREATOR_NETWORK.noPublicFollowerCounts).toBe(true);
    expect(CREATOR_NETWORK.liveDiscoveryReusesWhosLive).toBe(true);
    expect(CREATOR_NETWORK.messagingReusesDirectMessages).toBe(true);
    expect(CREATOR_NETWORK.activityReusesNotifications).toBe(true);
    expect(CREATOR_NETWORK.networkCentersOnCreativeWork).toBe(true);
    expect(CREATOR_NETWORK.exploreIsOnSocialHome).toBe(true);
    expect(CREATOR_NETWORK.homeComposesExistingDiscovery).toBe(true);
    expect(CREATOR_NETWORK.searchFollowIsNotConnect).toBe(true);
    expect(CREATOR_NETWORK.vybLabelIsVyb).toBe(true);
    expect(ARTIST_STAGE_PROFILE.connectIsARequest).toBe(true);
    expect(ARTIST_STAGE_PROFILE.connectRequestHydratesFromServer).toBe(true);
    expect(ARTIST_STAGE_PROFILE.noVanityFollowerCounts).toBe(true);
  });

  it("writes the distinction into PRODUCT", () => {
    const product = read("PRODUCT.md");
    expect(product).toContain("Follow");
    expect(product).toContain("It is not Connect");
    expect(product).toContain("No public follower counts");
    expect(product).toContain("VYB");
    expect(product).toContain("Explore on Home");
    expect(product).toContain("Node is a Search and + tool");
  });

  it("composes existing Network primitives instead of a second social stack", () => {
    const home = read("src/pages/SocialHomePage.tsx");
    const feed = read("src/pages/FeedPage.tsx");
    expect(home).toContain("WhosLivePanel");
    expect(home).toContain("SocialRoomsPanel");
    expect(home).toContain("TastePeopleStrip");
    expect(home).toContain("HomeLibraryPanel");
    expect(feed).toContain("HubActivity");
    expect(feed).toContain("network-following");
    expect(feed).toContain("listFollowedCreatorIds");
    expect(feed).toContain("listDropsFromAuthors");
    expect(feed).toContain("network-explore");
    expect(feed).toContain("listDiscovery");
    expect(read("src/components/shell/DrawerChrome.tsx")).toContain("ChatIndicator");
    expect(read("src/features/network/TastePeopleStrip.tsx")).toContain("FollowButton");
    expect(read("src/features/network/TastePeopleStrip.tsx")).not.toContain("api.connect");
    expect(read("src/features/network/TastePeopleStrip.tsx")).not.toContain("sharedPlays");
    expect(read("src/components/dashboard/DashMatchPanel.tsx")).toContain("export function DashMatchPanel");
    expect(read("src/lib/trackActions.ts")).toContain('"Vyb"');
    expect(read("src/components/FeedTrackRow.tsx")).toContain('aria-label="Vyb"');
    expect(read("src/components/FeedTrackRow.tsx")).not.toContain('aria-label="Like"');
    expect(read("src/pages/UserProfilePage.tsx")).toContain("connectionBlocksNewRequest");
    expect(read("src/features/profile/ArtistStageProfile.tsx")).toContain("FollowButton");
    expect(read("src/features/profile/ArtistStageProfile.tsx")).toContain("profile-connect");
    expect(read("src/features/profile/ArtistStageProfile.tsx")).toContain("Handshake");
    expect(read("src/features/profile/ArtistStageProfile.tsx")).not.toMatch(/Followers/);
    const truth = read("src/app/routeTruth.ts");
    expect(truth).toContain('path: "/", title: "Home"');
    expect(truth).toContain('"follow"');
    expect(truth).toContain('"following"');
    expect(truth).toMatch(/path: "\/connect", title: "Connect", keywords: \["people", "request", "collab"\]/);
    expect(truth).not.toMatch(/path: "\/connect"[^}]*"follow"/);
    const sql = read("supabase/migrations/20260821_0113_creator_follows.sql");
    expect(sql).toContain("creator_follows");
    expect(sql).toContain("Do not expose a public follower count");
    expect(sql).not.toMatch(/stripe/i);
    expect(sql).not.toContain("count(");
  });
});
