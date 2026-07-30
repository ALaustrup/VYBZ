/**
 * Desktop installer smoke — multi-platform DESKTOP_INSTALLERS.json (Phase 17).
 * Prefer real bundle artifacts; use --fixtures for dmg/appimage hashes when absent.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const feedScript = path.join(root, "scripts", "build-update-feed.mjs");
const installersPath = path.join(root, "apps", "desktop", "signing", "DESKTOP_INSTALLERS.json");
const noFixtures = process.argv.includes("--no-fixtures");

const result = spawnSync(
  process.execPath,
  [feedScript, ...(noFixtures ? [] : ["--fixtures"])],
  { stdio: "inherit", cwd: root, env: process.env },
);

if (result.status !== 0) process.exit(result.status ?? 1);

if (!existsSync(installersPath)) {
  console.error("[smoke-desktop-installer] missing DESKTOP_INSTALLERS.json");
  process.exit(1);
}

const table = JSON.parse(readFileSync(installersPath, "utf8"));
const platforms = table.platforms || {};
const dmg =
  platforms["darwin-aarch64"]?.sha256 || platforms["darwin-x86_64"]?.sha256;
const appimage = platforms["linux-x86_64"]?.sha256;

if (!dmg || !appimage) {
  console.error("[smoke-desktop-installer] expected dmg + appimage sha256 entries");
  process.exit(1);
}

console.log(
  "[smoke-desktop-installer] ok",
  "darwin=",
  String(dmg).slice(0, 12) + "…",
  "linux=",
  String(appimage).slice(0, 12) + "…",
);
process.exit(0);
