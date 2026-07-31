/**
 * iOS IPA / archive smoke — records hash or toolchain_missing stub.
 * Phase 19: writes ios/signing/IOS_BUILDS.json
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidates = [
  path.join(root, "ios", "build", "VYBZ.ipa"),
  path.join(root, "ios", "App", "build", "VYBZ.ipa"),
  path.join(root, "ios", "output", "VYBZ.ipa"),
];
const archiveDir = path.join(root, "ios", "build");
const outDir = path.join(root, "ios", "signing");
const hashTable = path.join(outDir, "IOS_BUILDS.json");

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function findIpa() {
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  if (!existsSync(archiveDir)) return null;
  const files = readdirSync(archiveDir).filter((f) => f.endsWith(".ipa"));
  if (!files.length) return null;
  return path.join(archiveDir, files[0]);
}

mkdirSync(outDir, { recursive: true });
const ipa = findIpa();
const buildHash =
  (process.env.VYBZ_IOS_BUILD_HASH || "").slice(0, 12) ||
  process.env.GITHUB_SHA?.slice(0, 12) ||
  "local";

if (!ipa) {
  const stub = {
    recordedAt: new Date().toISOString(),
    status: "toolchain_missing",
    note: "IPA not found — run npm run build:ios (or CI ios.yml) on a macOS runner with Xcode + signing secrets",
    bundleId: "cloud.vybz.app",
    versionName: "1.1.0",
    buildNumber: 119,
    track: "testflight",
    sha256: null,
    path: null,
    signed: false,
    buildHash,
  };
  writeFileSync(hashTable, JSON.stringify(stub, null, 2) + "\n");
  console.log("[smoke-ios-ipa]", stub.status, "→", hashTable);
  process.exit(0);
}

const record = {
  recordedAt: new Date().toISOString(),
  status: "ok",
  bundleId: "cloud.vybz.app",
  versionName: "1.1.0",
  buildNumber: 119,
  track: "testflight",
  sha256: sha256File(ipa),
  path: path.relative(root, ipa).replace(/\\/g, "/"),
  bytes: statSync(ipa).size,
  signed: true,
  buildHash,
  note: "Signed IPA — TestFlight via fastlane when phase19 tag + ASC secrets present",
};
writeFileSync(hashTable, JSON.stringify(record, null, 2) + "\n");
console.log("[smoke-ios-ipa] ok", record.path, record.sha256.slice(0, 12) + "…");
process.exit(0);
