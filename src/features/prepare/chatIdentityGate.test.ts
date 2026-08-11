/**
 * Chat identity gate.
 *
 * Social surfaces show the creator's artist / producer name, not a raw handle.
 * The artist entity is optional and gated behind tagged drops, so the resolver
 * must fall back through the profile display name before ever showing a username.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("chat identity", () => {
  it("resolves creator names through artist entity, display name, then handle", () => {
    const api = read("src/lib/api.ts");
    expect(api).toMatch(/export async function creatorNamesFor\(/);
    expect(api).toContain("artist_members");
    expect(api).toContain("artist_profiles(display_name, created_at)");
    expect(api).toContain("display_name");
  });

  it("room messages render the creator name rather than the username", () => {
    const api = read("src/lib/api.ts");
    const listRoomMessages = api.slice(api.indexOf("export async function listRoomMessages"));
    const body = listRoomMessages.slice(0, listRoomMessages.indexOf("export async function sendRoomMessage"));
    expect(body).toContain("creatorNamesFor");
    expect(body).not.toContain("usernamesFor");
  });

  it("presence announces the same name the messages use", () => {
    const room = read("src/pages/RoomPage.tsx");
    expect(room).toContain("profile?.displayName");
  });
});
