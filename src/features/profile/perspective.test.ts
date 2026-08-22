import { describe, expect, it } from "vitest";
import {
  isVisitorPreview,
  profilePerspective,
  showOwnerControls,
  showVisitorSocial,
} from "./perspective";

describe("profile perspective", () => {
  it("is owner only when the person owns the Stage File and is not previewing", () => {
    expect(profilePerspective({ isOwner: true })).toBe("owner");
    expect(profilePerspective({ isOwner: true, asVisitor: false })).toBe("owner");
    expect(profilePerspective({ isOwner: true, asVisitor: true })).toBe("visitor");
    expect(profilePerspective({ isOwner: false })).toBe("visitor");
    expect(profilePerspective({ isOwner: false, asVisitor: true })).toBe("visitor");
  });

  it("shows owner controls only in owner perspective", () => {
    expect(showOwnerControls("owner")).toBe(true);
    expect(showOwnerControls("visitor")).toBe(false);
  });

  it("never offers visitor social actions on your own VYBZ", () => {
    expect(showVisitorSocial(true)).toBe(false);
    expect(showVisitorSocial(false)).toBe(true);
  });

  it("treats only view=visitor as preview", () => {
    expect(isVisitorPreview("visitor")).toBe(true);
    expect(isVisitorPreview("owner")).toBe(false);
    expect(isVisitorPreview(null)).toBe(false);
    expect(isVisitorPreview(undefined)).toBe(false);
  });
});
