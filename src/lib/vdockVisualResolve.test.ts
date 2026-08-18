import { describe, expect, it } from "vitest";
import { VDOCK_VISUALS } from "@/lib/vdockVisualManifest";
import {
  DEFAULT_BACKDROP_VISUAL_ID,
  DEFAULT_VDOCK_VISUAL_ID,
  resolveVdockVisual,
} from "@/lib/vdockVisualResolve";

describe("Vizualz resolve", () => {
  it("resolves the default dock and backdrop films from the catalog", () => {
    expect(VDOCK_VISUALS.length).toBeGreaterThan(10);
    expect(resolveVdockVisual(DEFAULT_VDOCK_VISUAL_ID)?.id).toBe(DEFAULT_VDOCK_VISUAL_ID);
    expect(resolveVdockVisual(DEFAULT_BACKDROP_VISUAL_ID)?.id).toBe(DEFAULT_BACKDROP_VISUAL_ID);
    expect(resolveVdockVisual("not-a-visual")).toBeUndefined();
  });
});
