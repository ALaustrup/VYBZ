/**
 * Android APK smoke — records debug APK hash or toolchain_missing stub.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apkDir = path.join(root, "android", "app", "build", "outputs", "apk", "debug");
const outDir = path.join(root, "android", "signing");
const hashTable = path.join(outDir, "APK_HASHES.json");

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function findApk() {
  if (!existsSync(apkDir)) return null;
  const files = readdirSync(apkDir).filter((f) => f.endsWith(".apk"));
  if (!files.length) return null;
  return path.join(apkDir, files[0]);
}

mkdirSync(outDir, { recursive: true });
const apk = findApk();

if (!apk) {
  const stub = {
    recordedAt: new Date().toISOString(),
    status: "artifact_missing",
    note: "Debug APK not found — run npm run build:android:apk when Android SDK is available",
    applicationId: "cloud.vybz.app",
    versionName: "1.1.0",
    sha256: null,
    path: null,
    signed: false,
  };
  writeFileSync(hashTable, JSON.stringify(stub, null, 2) + "\n");
  console.log("[smoke-android-apk]", stub.status, "→", hashTable);
  process.exit(0);
}

const record = {
  recordedAt: new Date().toISOString(),
  status: "ok",
  applicationId: "cloud.vybz.app",
  versionName: "1.1.0",
  sha256: sha256File(apk),
  path: path.relative(root, apk).replace(/\\/g, "/"),
  bytes: statSync(apk).size,
  signed: false,
  note: "Debug APK — release signing via android/key.properties (never commit)",
};
writeFileSync(hashTable, JSON.stringify(record, null, 2) + "\n");
console.log("[smoke-android-apk] ok", record.path, record.sha256.slice(0, 12) + "…");
process.exit(0);
