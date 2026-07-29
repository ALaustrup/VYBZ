/**
 * Run K6 load test. Requires `k6` on PATH (or K6_BIN).
 * CI installs via grafana/k6-action.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(root, "tooling", "k6", "pack_checkout.js");
const bin = process.env.K6_BIN || "k6";

const result = spawnSync(bin, ["run", script], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
  shell: true,
});

if (result.error) {
  console.error("[perf:load] k6 not found. Install: https://k6.io/docs/get-started/installation/");
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
