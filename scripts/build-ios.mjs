/**
 * iOS archive / IPA build helper (macOS + Xcode required).
 * Usage: node scripts/build-ios.mjs
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspace = path.join(root, "ios", "App", "App.xcworkspace");
const project = path.join(root, "ios", "App", "App.xcodeproj");
const outDir = path.join(root, "ios", "build");
const archivePath = path.join(outDir, "VYBZ.xcarchive");
const exportPlist = path.join(root, "ios", "ExportOptions.plist");

if (process.platform !== "darwin") {
  console.error("[build-ios] macOS + Xcode required (skipping on", process.platform, ")");
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });

const sync = spawnSync("npx", ["cap", "sync", "ios"], { cwd: root, stdio: "inherit", shell: true });
if (sync.status !== 0) process.exit(sync.status ?? 1);

const scheme = "App";
const dest = existsSync(workspace) ? ["-workspace", workspace] : ["-project", project];
const archive = spawnSync(
  "xcodebuild",
  [
    ...dest,
    "-scheme",
    scheme,
    "-configuration",
    "Release",
    "-archivePath",
    archivePath,
    "archive",
    "CODE_SIGN_STYLE=Manual",
  ],
  { cwd: root, stdio: "inherit" }
);
if (archive.status !== 0) process.exit(archive.status ?? 1);

if (existsSync(exportPlist)) {
  const exportIpa = spawnSync(
    "xcodebuild",
    [
      "-exportArchive",
      "-archivePath",
      archivePath,
      "-exportOptionsPlist",
      exportPlist,
      "-exportPath",
      outDir,
    ],
    { cwd: root, stdio: "inherit" }
  );
  if (exportIpa.status !== 0) process.exit(exportIpa.status ?? 1);
}

console.log("[build-ios] archive →", archivePath);
process.exit(0);
