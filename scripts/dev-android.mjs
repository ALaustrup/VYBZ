#!/usr/bin/env node
/**
 * Android Capacitor sync helper for Phase 1.5.
 * Builds web dist then syncs into existing android/ seed.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

console.log("Building web → dist, then cap sync android…");
const build = spawnSync(npm, ["run", "build:web"], { cwd: root, stdio: "inherit", shell: true });
if (build.status !== 0) process.exit(build.status ?? 1);

const sync = spawnSync(npm, ["run", "cap:sync", "--", "android"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});
process.exit(sync.status ?? 1);
