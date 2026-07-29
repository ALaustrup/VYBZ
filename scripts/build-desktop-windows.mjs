#!/usr/bin/env node
/**
 * Windows desktop build entry. Documents blocker when Tauri toolchain missing.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const desktopDir = path.join(root, "apps", "desktop");

if (!existsSync(path.join(desktopDir, "src-tauri", "Cargo.toml"))) {
  console.error("Missing apps/desktop Tauri scaffold");
  process.exit(1);
}

const rustc = spawnSync("rustc", ["--version"], { encoding: "utf8" });
if (rustc.status !== 0) {
  console.log(`
build:desktop:windows — Rust/Tauri toolchain not installed (documented Phase 1.5 blocker).

Mitigation: web + PlatformBridge desktop stub ship independently.
When Rust is available: cd apps/desktop && npm install && npm run tauri:build
`);
  process.exit(0);
}

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const web = spawnSync(npm, ["run", "build:web"], { cwd: root, stdio: "inherit", shell: true });
if (web.status !== 0) process.exit(web.status ?? 1);
const build = spawnSync(npm, ["run", "tauri:build"], {
  cwd: desktopDir,
  stdio: "inherit",
  shell: true,
});
process.exit(build.status ?? 1);
