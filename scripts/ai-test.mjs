#!/usr/bin/env node
/**
 * Phase 15 AI golden gate — fail if remaster RMS diff > 0.3 dB.
 * Used by CI job `ai-test` and `npm run ai:test`.
 */
import { spawnSync } from "node:child_process";

const r = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vitest", "run", "packages/processing/mastering/src/golden.test.ts", "--reporter=dot"],
  { stdio: "inherit", shell: process.platform === "win32" }
);
if (r.status !== 0) {
  console.error("ai:test FAILED — golden RMS diff exceeded gate");
  process.exit(r.status ?? 1);
}
console.log("ai:test OK — golden RMS within ±0.3 dB");
