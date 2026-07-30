#!/usr/bin/env node
/**
 * cost:test — budget/kill-switch unit gate for CI.
 * Fails if free-tier exceeded without kill-switch flag.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const r = spawnSync(
  npm,
  [
    "exec",
    "--",
    "vitest",
    "run",
    "src/platform/costs/budget.enforcement.test.ts",
    "src/platform/costs/sentinel.test.ts",
  ],
  { cwd: root, stdio: "inherit", shell: true }
);

process.exit(r.status ?? 1);
