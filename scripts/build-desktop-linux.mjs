#!/usr/bin/env node
/**
 * Linux AppImage build entry. Documents blocker when not on Linux / Rust missing.
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

if (process.platform !== "linux") {
  console.log(`
build:desktop:linux — requires Linux (CI: ubuntu-latest).

Local: use GitHub Actions linux-appimage job, or a Linux host with Rust.
Artifacts: apps/desktop/src-tauri/target/release/bundle/appimage/*.AppImage
`);
  process.exit(0);
}

const rustc = spawnSync("rustc", ["--version"], { encoding: "utf8" });
if (rustc.status !== 0) {
  console.log("build:desktop:linux — Rust toolchain missing");
  process.exit(0);
}

const web = spawnSync("npm", ["run", "build:web"], { cwd: root, stdio: "inherit" });
if (web.status !== 0) process.exit(web.status ?? 1);
const build = spawnSync(
  "npx",
  ["tauri", "build", "--bundles", "appimage"],
  { cwd: desktopDir, stdio: "inherit", env: process.env },
);
process.exit(build.status ?? 1);
