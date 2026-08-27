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
    expect(ARTIST_STAGE_PROFILE.connectIsARequest).toBe(true);
    expect(ARTIST_STAGE_PROFILE.noVanityFollowerCounts).toBe(true);
  });

  it("writes the distinction into PRODUCT", () => {
    const product = read("PRODUCT.md");
    expect(product).toContain("Follow");
    expect(product).toContain("It is not Connect");
    expect(product).toContain("No public follower counts");
    expect(product).toContain("VYB");
  });

  it("composes existing Network primitives instead of a second social stack", () => {
    const feed = read("src/pages/FeedPage.tsx");
    expect(feed).toContain("WhosLivePanel");
    expect(feed).toContain("HubActivity");
    expect(feed).toContain("SocialRoomsPanel");
    expect(feed).toContain('to="/messages"');
    expect(feed).toContain("network-following");
    expect(feed).toContain("listFollowedCreatorIds");
    expect(feed).toContain("listDropsFromAuthors");
    expect(read("src/lib/trackActions.ts")).toContain('"Vyb"');
    expect(read("src/features/profile/ArtistStageProfile.tsx")).toContain("FollowButton");
    expect(read("src/features/profile/ArtistStageProfile.tsx")).toContain("profile-connect");
    expect(read("src/features/profile/ArtistStageProfile.tsx")).not.toMatch(/Followers/);
    const sql = read("supabase/migrations/20260821_0113_creator_follows.sql");
    expect(sql).toContain("creator_follows");
    expect(sql).toContain("Do not expose a public follower count");
    expect(sql).not.toMatch(/stripe/i);
    expect(sql).not.toContain("count(");
  });
});
