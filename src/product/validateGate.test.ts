import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GATE_REGISTRY, VALIDATION } from "@/product/invariants";

const ROOT = path.resolve(__dirname, "../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("validation pipeline (Vercel merge gate)", () => {
  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("validatePipeline");
    expect(VALIDATION.singleValidateCommand).toBe(true);
    expect(VALIDATION.vercelPreviewRunsValidate).toBe(true);
    expect(VALIDATION.vercelIsMergeGate).toBe(true);
    expect(VALIDATION.productionWalkIsReleaseEvidence).toBe(true);
  });

  it("defines one validate command: lint → typecheck → test → build", () => {
    const pkg = read("package.json");
    expect(pkg).toMatch(/"validate"\s*:\s*"npm run lint && npm run typecheck && npm run test && npm run build"/);
    expect(pkg).toMatch(/"lint"\s*:\s*"tsc --noEmit"/);
    expect(pkg).toMatch(/"typecheck"\s*:\s*"tsc --noEmit"/);
    expect(pkg).toMatch(/"test"\s*:\s*"vitest run"/);
    expect(pkg).toMatch(/"build"\s*:\s*"tsc --noEmit && vite build"/);
  });

  it("runs validate on every Vercel Preview and Production build", () => {
    const vercel = read("vercel.json");
    expect(vercel).toContain('"buildCommand": "npm run validate"');
  });

  it("documents Vercel as the merge gate and production walk as release evidence", () => {
    const gate = read("docs/engineering/VERCEL_BRANCH_GATE.md");
    const agents = read("AGENTS.md");
    expect(gate).toContain("npm run validate");
    expect(gate).toContain("Vercel");
    expect(gate).toContain("signed-in production walk");
    expect(agents).toContain("npm run validate");
    expect(agents).toContain("VERCEL_BRANCH_GATE.md");
    expect(agents).toContain("Signed-in production walks");
  });
});
