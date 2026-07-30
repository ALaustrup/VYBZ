import { describe, expect, it } from "vitest";
import {
  shouldPromptFlexibleUpdate,
  UPDATE_AVAILABLE,
  type InAppUpdateInfo,
} from "./inAppUpdate";

describe("inAppUpdate (Play flexible / beta)", () => {
  it("prompts only when beta track has a flexible update available", () => {
    const ready: InAppUpdateInfo = {
      updateAvailability: UPDATE_AVAILABLE,
      availableVersionCode: 114,
      isFlexibleAllowed: true,
      track: "beta",
    };
    expect(shouldPromptFlexibleUpdate(ready)).toBe(true);
  });

  it("does not prompt when update is not available", () => {
    expect(
      shouldPromptFlexibleUpdate({
        updateAvailability: 1,
        availableVersionCode: 0,
        isFlexibleAllowed: true,
        track: "beta",
      })
    ).toBe(false);
  });

  it("does not prompt when flexible is disallowed", () => {
    expect(
      shouldPromptFlexibleUpdate({
        updateAvailability: UPDATE_AVAILABLE,
        availableVersionCode: 114,
        isFlexibleAllowed: false,
        track: "beta",
      })
    ).toBe(false);
  });
});
