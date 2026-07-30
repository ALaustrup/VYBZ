/**
 * Android AAB smoke — records release bundle hash or toolchain_missing stub.
 * Phase 13: writes android/signing/ANDROID_BUNDLES.json
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const aabDir = path.join(root, "android", "app", "build", "outputs", "bundle", "release");
const outDir = path.join(root, "android", "signing");
const hashTable = path.join(outDir, "ANDROID_BUNDLES.json");

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function findAab() {
  if (!existsSync(aabDir)) return null;
  const files = readdirSync(aabDir).filter((f) => f.endsWith(".aab"));
  if (!files.length) return null;
  return path.join(aabDir, files[0]);
}

mkdirSync(outDir, { recursive: true });
const aab = findAab();
const buildHash =
  (process.env.VYBZ_ANDROID_BUILD_HASH || "").slice(0, 12) ||
  process.env.GITHUB_SHA?.slice(0, 12) ||
  "local";

if (!aab) {
  const stub = {
    recordedAt: new Date().toISOString(),
    status: "toolchain_missing",
    note: "Release AAB not found — run npm run build:android:aab (or CI android.yml) when SDK + Gradle available",
    applicationId: "cloud.vybz.app",
    versionName: "1.1.0",
    versionCode: 113,
    track: "beta",
    sha256: null,
    path: null,
    signed: false,
    buildHash,
  };
  writeFileSync(hashTable, JSON.stringify(stub, null, 2) + "\n");
  console.log("[smoke-android-aab]", stub.status, "→", hashTable);
  process.exit(0);
}

const signed = existsSync(path.join(root, "android", "key.properties"));
const record = {
  recordedAt: new Date().toISOString(),
  status: "ok",
  applicationId: "cloud.vybz.app",
  versionName: "1.1.0",
  versionCode: 113,
  track: "beta",
  sha256: sha256File(aab),
  path: path.relative(root, aab).replace(/\\/g, "/"),
  bytes: statSync(aab).size,
  signed,
  buildHash,
  note: signed
    ? "Signed release AAB — upload key via ANDROID_KEYSTORE_* secrets (never commit)"
    : "Unsigned release AAB — add key.properties / ANDROID_KEYSTORE_* for Play upload",
};
writeFileSync(hashTable, JSON.stringify(record, null, 2) + "\n");
console.log("[smoke-android-aab] ok", record.path, record.sha256.slice(0, 12) + "…");
process.exit(0);
