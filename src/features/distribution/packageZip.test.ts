import { describe, expect, it } from "vitest";
import { buildZip, sha256Hex } from "./packageZip";
import { buildDistributionPackage, buildDistributionReport } from "./buildReport";

describe("distribution ZIP package", () => {
  it("builds a ZIP with report and stable SHA", async () => {
    const report = buildDistributionReport("rel-1", {
      title: "Pack Fixture",
      isrc: "USRC17607839",
      hasAudio: true,
      hasArtwork: true,
      loudness: { integratedLufs: -14 },
      artwork: { fileName: "a.png", mimeType: "image/png", sizeBytes: 1, width: 3000, height: 3000, dpi: 300 },
      requireLoudness: true,
    });
    expect(report.verdict).toBe("pass");
    const pkg = await buildDistributionPackage(report);
    expect(pkg.bytes[0]).toBe(0x50); // P
    expect(pkg.bytes[1]).toBe(0x4b); // K
    expect(pkg.sha256).toHaveLength(64);
    expect(pkg.fileName).toContain("distribution.zip");

    const again = await sha256Hex(pkg.bytes);
    expect(again).toBe(pkg.sha256);
  });

  it("crc ZIP contains report path", async () => {
    const bytes = buildZip([{ path: "hello.txt", bytes: new TextEncoder().encode("hi") }]);
    const asText = new TextDecoder().decode(bytes);
    expect(asText).toContain("hello.txt");
  });
});
