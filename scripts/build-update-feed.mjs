/**
 * Build Tauri updater feed (stable.json) for https://update.vybz.cloud/windows/
 *
 * Usage:
 *   node scripts/build-update-feed.mjs
 *   node scripts/build-update-feed.mjs --upload   # needs UPDATE_BUCKET_WRITE_TOKEN (R2/S3 or CF)
 *
 * Looks for MSI under apps/desktop/src-tauri/target/release/bundle/msi/
 * Falls back to NSIS .exe when MSI missing (local / unsigned CI).
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const msiDir = path.join(root, "apps", "desktop", "src-tauri", "target", "release", "bundle", "msi");
const nsisDir = path.join(root, "apps", "desktop", "src-tauri", "target", "release", "bundle", "nsis");
const outDir = path.join(root, "apps", "desktop", "updater", "dist");
const channelsPath = path.join(root, "apps", "desktop", "updater", "channels.json");
const installersPath = path.join(root, "apps", "desktop", "signing", "DESKTOP_INSTALLERS.json");

const VERSION = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).version;
const wantUpload = process.argv.includes("--upload");

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function findArtifact() {
  for (const dir of [msiDir, nsisDir]) {
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f) => f.endsWith(".msi") || f.endsWith(".exe"));
    if (files.length) return path.join(dir, files[0]);
  }
  return null;
}

function loadChannels() {
  return JSON.parse(readFileSync(channelsPath, "utf8"));
}

const artifact = findArtifact();
const channels = loadChannels();
const base = channels.channels.stable.artifactBase.replace(/\/?$/, "/");
mkdirSync(outDir, { recursive: true });

const pubDate = new Date().toISOString();
let feed;
let installerRecord;

if (!artifact) {
  feed = {
    version: VERSION,
    notes: "No local installer — feed stub for CI/dev. Replace after signed MSI build.",
    pub_date: pubDate,
    platforms: {},
  };
  installerRecord = {
    recordedAt: pubDate,
    status: "artifact_missing",
    channel: "stable",
    version: VERSION,
    sha256: null,
    path: null,
    feed: "apps/desktop/updater/dist/stable.json",
  };
} else {
  const name = path.basename(artifact);
  const sha256 = sha256File(artifact);
  const url = `${base}${name}`;
  const signature = process.env.TAURI_UPDATER_SIGNATURE || "UNSIGNED_PLACEHOLDER";
  const platformKey = "windows-x86_64";
  feed = {
    version: VERSION,
    notes: `VYBZ Desktop ${VERSION} (stable)`,
    pub_date: pubDate,
    platforms: {
      [platformKey]: {
        signature,
        url,
        sha256,
        bytes: statSync(artifact).size,
      },
    },
  };
  installerRecord = {
    recordedAt: pubDate,
    status: "ok",
    channel: "stable",
    version: VERSION,
    sha256,
    path: path.relative(root, artifact).replace(/\\/g, "/"),
    bytes: statSync(artifact).size,
    signed: Boolean(process.env.WINDOWS_CERT_BASE64),
    feedUrl: channels.updater.feedUrl,
  };
}

const feedPath = path.join(outDir, "stable.json");
writeFileSync(feedPath, JSON.stringify(feed, null, 2) + "\n");
writeFileSync(installersPath, JSON.stringify(installerRecord, null, 2) + "\n");
console.log("[build-update-feed]", feedPath);
console.log("[build-update-feed]", installersPath, installerRecord.status);

if (wantUpload) {
  const token = process.env.UPDATE_BUCKET_WRITE_TOKEN;
  const uploadUrl = process.env.UPDATE_FEED_UPLOAD_URL;
  if (!token || !uploadUrl) {
    console.warn("[build-update-feed] --upload skipped: set UPDATE_BUCKET_WRITE_TOKEN + UPDATE_FEED_UPLOAD_URL");
    process.exit(0);
  }
  const body = readFileSync(feedPath);
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body,
  });
  if (!res.ok) {
    console.error("[build-update-feed] upload failed", res.status, await res.text());
    process.exit(1);
  }
  console.log("[build-update-feed] uploaded →", uploadUrl);
}

process.exit(0);
