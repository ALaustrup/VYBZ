#!/usr/bin/env node
/**
 * Android APK/AAB build entry for Phase 1.5 scaffolding.
 * Requires Android SDK / Gradle — exits with guidance when unavailable.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const target = process.argv[2] === "aab" ? "aab" : "apk";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const androidDir = path.join(root, "android");
const gradlew = path.join(androidDir, process.platform === "win32" ? "gradlew.bat" : "gradlew");

if (!existsSync(gradlew)) {
  console.error("android/ Gradle project missing");
  process.exit(1);
}

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const sync = spawnSync(npm, ["run", "sync:android"], { cwd: root, stdio: "inherit", shell: true });
if (sync.status !== 0) {
  console.log(`
build:android:${target} — sync failed or Android SDK not configured.

Mitigation: Capacitor bridge stub + android/ seed are in-repo.
Open Android Studio: npm run android:open
`);
  process.exit(sync.status ?? 1);
}

const task =
  target === "aab"
    ? ["bundleRelease"]
    : ["assembleDebug"];

const gradle = spawnSync(gradlew, task, {
  cwd: androidDir,
  stdio: "inherit",
  shell: true,
});
process.exit(gradle.status ?? 1);
