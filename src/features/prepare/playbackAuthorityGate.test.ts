/**
 * Playback authority gate — private-by-default playback.
 *
 * `audio-play` must be the only way to reach audio bytes. The client holds an anon
 * key against a bucket policy that cannot see a drop's audience, so any client-side
 * signing of a playback URL authorises everyone. The ticket path is the only place
 * `can_user_play_path` is evaluated.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GATE_REGISTRY, PRINCIPLES } from "@/product/invariants";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("playback authority", () => {
  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("playbackAuthority");
  });

  it("never signs a playback URL on the client", () => {
    const api = read("src/lib/api.ts");
    const playback = api.slice(
      api.indexOf("async function signAudio"),
      api.indexOf("export async function uploadAvatar"),
    );
    expect(playback.length).toBeGreaterThan(0);
    // The bypass this gate exists to prevent.
    expect(playback).not.toContain("createSignedUrls");
    expect(playback).toContain("mintPlayUrls");
  });

  it("routes every stored path through the ticket minter", () => {
    const api = read("src/lib/api.ts");
    expect(api).toContain("functions/v1/audio-play");
    // Batched so a large feed is one bounded request set, not one call per track.
    expect(api).toContain("PLAY_TICKET_BATCH");
  });

  it("keeps the edge function failing closed on an unevaluable check", () => {
    const edge = read("supabase/functions/audio-play/index.ts");
    expect(edge).toContain("can_user_play_path");
    // allowed must be strictly true; an error must deny.
    expect(edge).toMatch(/!visErr && allowed === true/);
    expect(edge).toContain("denied");
  });

  it("ships the storage lock as an unapplied, reversible migration", () => {
    const up = "supabase/migrations/20260815_0096_lock_audio_assets_read.sql";
    const down = "supabase/migrations/20260815_0096_lock_audio_assets_read.down.sql";
    expect(existsSync(path.join(ROOT, up))).toBe(true);
    expect(existsSync(path.join(ROOT, down))).toBe(true);

    const sql = read(up);
    expect(sql).toContain("storage.foldername(name))[1] = (auth.uid())::text");
    // The sequencing warning must survive; applying this early breaks playback.
    expect(sql).toContain("DO NOT APPLY THIS UNTIL STEP 2 IS LIVE");
  });

  it("holds the principle it enforces", () => {
    expect(PRINCIPLES.playbackIsDryAndDisclosed).toBe(true);
  });
});
