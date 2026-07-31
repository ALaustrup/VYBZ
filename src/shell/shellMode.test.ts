import { describe, expect, it } from "vitest";
import { isDenseShell, isTouchShell, shellModeClass } from "@/shell/shellMode";

describe("shellMode", () => {
  it("maps css classes", () => {
    expect(shellModeClass("web")).toBe("shell-mode-web");
    expect(shellModeClass("desktop")).toBe("shell-mode-desktop");
    expect(shellModeClass("android")).toBe("shell-mode-android");
    expect(shellModeClass("ios")).toBe("shell-mode-ios");
  });

  it("classifies density / touch", () => {
    expect(isDenseShell("desktop")).toBe(true);
    expect(isTouchShell("android")).toBe(true);
    expect(isTouchShell("ios")).toBe(true);
    expect(isTouchShell("web")).toBe(false);
  });
});
