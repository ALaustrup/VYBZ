import { describe, expect, it } from "vitest";
import { deepLinkToAppPath, parseDeepLink } from "@/platform/deeplinks";

describe("vybz:// deep links", () => {
  it("parses vybz://release/{id}", () => {
    const link = parseDeepLink("vybz://release/abc-123");
    expect(link.kind).toBe("open_release");
    expect(link.releaseId).toBe("abc-123");
    expect(deepLinkToAppPath(link)).toBe("/release/abc-123");
  });

  it("parses https release paths", () => {
    const link = parseDeepLink("https://vybz.cloud/release/xyz");
    expect(link.kind).toBe("open_release");
    expect(deepLinkToAppPath(link)).toBe("/release/xyz");
  });
});
