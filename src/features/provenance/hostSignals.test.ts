import { afterEach, describe, expect, it } from "vitest";
import {
  noteChatSent,
  noteKey,
  notePointer,
  peekHostSignals,
  resetHostSignals,
  takeHostSignalSnapshot,
} from "./hostSignals";

describe("declared host signals", () => {
  afterEach(() => {
    resetHostSignals();
  });

  it("starts empty and labels the snapshot as declared", () => {
    const snap = takeHostSignalSnapshot({
      dawStreaming: false,
      micTrackLive: false,
      focused: true,
    });
    expect(snap.kind).toBe("declared");
    expect(snap.pointer).toBe(false);
    expect(snap.key).toBe(false);
    expect(snap.chat).toBe(false);
    expect(snap.focused).toBe(true);
  });

  it("latches activity in the window then clears on take", () => {
    notePointer();
    noteKey();
    noteChatSent();
    expect(peekHostSignals()).toEqual({ pointer: true, key: true, chat: true });
    const snap = takeHostSignalSnapshot({
      dawStreaming: true,
      micTrackLive: true,
      focused: false,
    });
    expect(snap.pointer).toBe(true);
    expect(snap.dawStreaming).toBe(true);
    expect(snap.micTrackLive).toBe(true);
    expect(snap.focused).toBe(false);
    expect(peekHostSignals()).toEqual({ pointer: false, key: false, chat: false });
  });
});
