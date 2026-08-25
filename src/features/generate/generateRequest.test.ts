import { describe, expect, it } from "vitest";
import {
  clampGenerateDuration,
  clampGeneratePrompt,
  generationDisclosure,
  titleFromPrompt,
  GENERATE_DEFAULT_SECONDS,
  GENERATE_MAX_SECONDS,
  GENERATE_MIN_SECONDS,
} from "./generateRequest";

describe("generate request", () => {
  it("clamps duration to the first-slice window", () => {
    expect(clampGenerateDuration(1)).toBe(GENERATE_MIN_SECONDS);
    expect(clampGenerateDuration(120)).toBe(GENERATE_MAX_SECONDS);
    expect(clampGenerateDuration("nope")).toBe(GENERATE_DEFAULT_SECONDS);
  });

  it("trims and caps the prompt", () => {
    expect(clampGeneratePrompt("  hello  ")).toBe("hello");
    expect(clampGeneratePrompt("x".repeat(800)).length).toBe(500);
  });

  it("titles from the declared prompt", () => {
    expect(titleFromPrompt("lo-fi beat")).toBe("lo-fi beat");
    expect(titleFromPrompt("")).toBe("Generated");
  });

  it("discloses generation instead of pretending it is a live recap", () => {
    const text = generationDisclosure({ prompt: "pad", model: "small-music", seed: 3 });
    expect(text).toContain("Generated with Stable Audio 3");
    expect(text).toContain("declared");
    expect(text).toContain("pad");
  });
});
