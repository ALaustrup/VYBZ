import { describe, expect, it } from "vitest";
import {
  applyCompanionMessage,
  companionTopic,
  INITIAL_COMPANION_STATE,
  parseCompanionMessage,
} from "./companionProtocol";
import { createMemoryTransport, openCompanionChannel } from "./companionChannel";

describe("companion protocol", () => {
  it("scopes the realtime topic to the live session", () => {
    expect(companionTopic("abc")).toBe("vybz-companion:abc");
  });

  it("rejects a fader without a measured value", () => {
    expect(parseCompanionMessage({ type: "fader", id: "master" })).toBeNull();
    expect(parseCompanionMessage({ type: "fader", id: "master", value: 1.5 })).toEqual({
      type: "fader",
      id: "master",
      value: 1,
    });
  });

  it("keeps lockstep position nullable instead of inventing a clock", () => {
    expect(parseCompanionMessage({ type: "lockstep", playing: true, positionMs: null })).toEqual({
      type: "lockstep",
      playing: true,
      positionMs: null,
    });
    expect(applyCompanionMessage(INITIAL_COMPANION_STATE, {
      type: "lockstep",
      playing: false,
      positionMs: null,
    }).positionMs).toBeNull();
  });

  it("applies mute and fader into state", () => {
    const next = applyCompanionMessage(INITIAL_COMPANION_STATE, {
      type: "fader",
      id: "master",
      value: 0.4,
    });
    expect(next.master).toBe(0.4);
    expect(applyCompanionMessage(next, { type: "mute", id: "master", muted: true }).masterMuted).toBe(true);
  });

  it("round-trips over an injected memory transport", async () => {
    const transport = createMemoryTransport();
    const handle = openCompanionChannel({
      sessionId: "s1",
      role: "remote",
      deviceLabel: "Pixel",
      transport,
    });
    expect(handle).not.toBeNull();
    expect(transport.inbox[0]).toEqual({ type: "hello", role: "remote", deviceLabel: "Pixel" });

    let seen = handle!.state();
    handle!.subscribe((s) => {
      seen = s;
    });
    await handle!.send({ type: "fader", id: "cue", value: 0.2 });
    expect(seen.cue).toBe(0.2);
    handle!.close();
  });
});
