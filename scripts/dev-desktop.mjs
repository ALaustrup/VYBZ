#!/usr/bin/env node
/**
 * Desktop PoC launcher. Requires Rust + Tauri CLI (see apps/desktop/README.md).
 * Exits with guidance when toolchain is missing — does not fail web CI.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const desktopDir = path.join(root, "apps", "desktop");
const cargoToml = path.join(desktopDir, "src-tauri", "Cargo.toml");

if (!existsSync(cargoToml)) {
  console.error("VYBZ Desktop PoC missing. Expected:", cargoToml);
  process.exit(1);
}

const rustc = spawnSync("rustc", ["--version"], { encoding: "utf8" });
if (rustc.status !== 0) {
  console.log(`
VYBZ Desktop (Tauri) PoC — toolchain not detected.

Install:
  1. Rust: https://rustup.rs
  2. Tauri prerequisites: https://v2.tauri.app/start/prerequisites/
  3. From repo root: npm run build:web
  4. cd apps/desktop && npm install && npm run tauri:dev

Web development is unaffected: npm run dev:web
`);
  process.exit(0);
}

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npm, ["run", "tauri:dev"], {
  cwd: desktopDir,
  stdio: "inherit",
  shell: true,
});
process.exit(result.status ?? 1);
