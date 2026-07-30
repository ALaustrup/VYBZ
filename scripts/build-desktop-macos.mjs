#!/usr/bin/env node
/**
 * macOS DMG build entry. Documents blocker when not on macOS / Rust missing.
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

if (process.platform !== "darwin") {
  console.log(`
build:desktop:macos — requires macOS (CI: macos-latest).

Local: use GitHub Actions mac-dmg job, or a Mac with Xcode + Rust.
Artifacts: apps/desktop/src-tauri/target/release/bundle/dmg/*.dmg
`);
  process.exit(0);
}

const rustc = spawnSync("rustc", ["--version"], { encoding: "utf8" });
if (rustc.status !== 0) {
  console.log("build:desktop:macos — Rust toolchain missing");
  process.exit(0);
}

const npm = "npm";
const web = spawnSync(npm, ["run", "build:web"], { cwd: root, stdio: "inherit" });
if (web.status !== 0) process.exit(web.status ?? 1);
const build = spawnSync(
  "npx",
  ["tauri", "build", "--bundles", "dmg"],
  { cwd: desktopDir, stdio: "inherit", env: process.env },
);
process.exit(build.status ?? 1);
