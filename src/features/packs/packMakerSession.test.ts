import { afterEach, describe, expect, it } from "vitest";
import {
  getPackMakerSession,
  handoffPackMakerToStorefront,
  resetPackMakerSession,
  setPackMakerSession,
} from "./packMakerSession";
import { peekPackHandoff, takePackHandoff } from "./packHandoff";

describe("pack maker session", () => {
  afterEach(() => {
    resetPackMakerSession();
    takePackHandoff();
  });

  it("survives a title write so leaving the page does not empty the pack", () => {
    setPackMakerSession({ title: "helix-kit" });
    expect(getPackMakerSession().title).toBe("helix-kit");
    expect(getPackMakerSession().samples).toEqual([]);
  });

  it("refuses a storefront handoff when there are no samples", async () => {
    expect(await handoffPackMakerToStorefront()).toBe("empty");
    expect(peekPackHandoff()).toBeNull();
  });
});
