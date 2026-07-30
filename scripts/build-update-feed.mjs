/**
 * Build per-OS Tauri updater feeds + multi-platform DESKTOP_INSTALLERS.json
 *
 * Outputs:
 *   apps/desktop/updater/dist/windows/stable.json
 *   apps/desktop/updater/dist/darwin/stable.json
 *   apps/desktop/updater/dist/linux/stable.json
 *   apps/desktop/updater/dist/stable.json  (windows alias for Phase 12 clients)
 *   apps/desktop/signing/DESKTOP_INSTALLERS.json
 *
 * Usage:
 *   node scripts/build-update-feed.mjs
 *   node scripts/build-update-feed.mjs --upload
 *   node scripts/build-update-feed.mjs --fixtures   # hash placeholder dmg/appimage for local gate
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
  copyFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundleRoot = path.join(root, "apps", "desktop", "src-tauri", "target", "release", "bundle");
const outDist = path.join(root, "apps", "desktop", "updater", "dist");
const channelsPath = path.join(root, "apps", "desktop", "updater", "channels.json");
const installersPath = path.join(root, "apps", "desktop", "signing", "DESKTOP_INSTALLERS.json");
const fixturesDir = path.join(root, "apps", "desktop", "signing", "fixtures");

const VERSION = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).version;
const wantUpload = process.argv.includes("--upload");
const wantFixtures = process.argv.includes("--fixtures") || process.env.VYBZ_DESKTOP_FEED_FIXTURES === "1";

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function firstFile(dir, pred) {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter(pred);
  return files.length ? path.join(dir, files[0]) : null;
}

function ensureFixtures() {
  mkdirSync(fixturesDir, { recursive: true });
  const dmg = path.join(fixturesDir, "VYBZ_1.1.0_aarch64.dmg");
  const appimage = path.join(fixturesDir, "VYBZ_1.1.0_amd64.AppImage");
  if (!existsSync(dmg)) {
    writeFileSync(dmg, Buffer.from("VYBZ-PHASE17-DMG-FIXTURE\n"));
  }
  if (!existsSync(appimage)) {
    writeFileSync(appimage, Buffer.from("VYBZ-PHASE17-APPIMAGE-FIXTURE\n"));
  }
  return { dmg, appimage };
}

/** @returns {Array<{ os: string, platformKey: string, kind: string, file: string | null, fixture?: boolean }>} */
function collectArtifacts() {
  const msi = firstFile(path.join(bundleRoot, "msi"), (f) => f.endsWith(".msi"));
  const nsis = firstFile(path.join(bundleRoot, "nsis"), (f) => f.endsWith(".exe"));
  const dmg = firstFile(path.join(bundleRoot, "dmg"), (f) => f.endsWith(".dmg"));
  const appimage = firstFile(path.join(bundleRoot, "appimage"), (f) =>
    f.endsWith(".AppImage"),
  );

  const rows = [
    {
      os: "windows",
      platformKey: "windows-x86_64",
      kind: msi ? "msi" : "nsis",
      file: msi || nsis,
    },
    {
      os: "darwin",
      platformKey: "darwin-aarch64",
      kind: "dmg",
      file: dmg,
    },
    {
      os: "linux",
      platformKey: "linux-x86_64",
      kind: "appimage",
      file: appimage,
    },
  ];

  if (wantFixtures) {
    const fx = ensureFixtures();
    if (!rows[1].file) {
      rows[1].file = fx.dmg;
      rows[1].fixture = true;
    }
    if (!rows[2].file) {
      rows[2].file = fx.appimage;
      rows[2].fixture = true;
    }
  }

  return rows;
}

function loadChannels() {
  return JSON.parse(readFileSync(channelsPath, "utf8"));
}

const channels = loadChannels();
const artifacts = collectArtifacts();
const pubDate = new Date().toISOString();
const platformsRecord = {};

for (const row of artifacts) {
  const osChannels = channels.channels.stable.platforms[row.os];
  const base = (osChannels?.artifactBase || `https://update.vybz.cloud/${row.os}/`).replace(
    /\/?$/,
    "/",
  );
  const osOut = path.join(outDist, row.os);
  mkdirSync(osOut, { recursive: true });

  let feed;
  if (!row.file) {
    feed = {
      version: VERSION,
      notes: `No ${row.os} installer — feed stub. Build on CI (${row.kind}).`,
      pub_date: pubDate,
      platforms: {},
    };
    platformsRecord[row.platformKey] = {
      status: "artifact_missing",
      kind: row.kind,
      sha256: null,
      path: null,
      feed: `apps/desktop/updater/dist/${row.os}/stable.json`,
    };
  } else {
    const name = path.basename(row.file);
    const sha256 = sha256File(row.file);
    const url = `${base}${name}`;
    const signature = process.env.TAURI_UPDATER_SIGNATURE || "UNSIGNED_PLACEHOLDER";
    feed = {
      version: VERSION,
      notes: `VYBZ Desktop ${VERSION} (${row.os} stable)`,
      pub_date: pubDate,
      platforms: {
        [row.platformKey]: {
          signature,
          url,
          sha256,
          bytes: statSync(row.file).size,
        },
      },
    };
    // darwin universal / x64 share same dmg when only one artifact is present
    if (row.os === "darwin" && !feed.platforms["darwin-x86_64"]) {
      feed.platforms["darwin-x86_64"] = { ...feed.platforms[row.platformKey] };
    }
    platformsRecord[row.platformKey] = {
      status: row.fixture ? "fixture" : "ok",
      kind: row.kind,
      sha256,
      path: path.relative(root, row.file).replace(/\\/g, "/"),
      bytes: statSync(row.file).size,
      signed: row.fixture
        ? false
        : row.os === "windows"
          ? Boolean(process.env.WINDOWS_CERT_BASE64)
          : row.os === "darwin"
            ? Boolean(process.env.MAC_CERT_BASE64 || process.env.APPLE_CERTIFICATE)
            : false,
      feedUrl: osChannels?.endpoint,
      fixture: Boolean(row.fixture),
    };
    if (row.os === "darwin") {
      platformsRecord["darwin-x86_64"] = {
        ...platformsRecord[row.platformKey],
        note: "Shares aarch64 DMG entry until universal split",
      };
    }
  }

  const feedPath = path.join(osOut, "stable.json");
  writeFileSync(feedPath, JSON.stringify(feed, null, 2) + "\n");
  console.log("[build-update-feed]", feedPath);

  if (row.os === "windows") {
    // Phase 12 alias path
    mkdirSync(outDist, { recursive: true });
    copyFileSync(feedPath, path.join(outDist, "stable.json"));
  }
}

const installerRecord = {
  recordedAt: pubDate,
  channel: "stable",
  version: VERSION,
  phase: 17,
  platforms: platformsRecord,
};

writeFileSync(installersPath, JSON.stringify(installerRecord, null, 2) + "\n");
console.log("[build-update-feed]", installersPath);

if (wantUpload) {
  const token = process.env.UPDATE_BUCKET_WRITE_TOKEN;
  const uploadUrl = process.env.UPDATE_FEED_UPLOAD_URL;
  if (!token || !uploadUrl) {
    console.warn(
      "[build-update-feed] --upload skipped: set UPDATE_BUCKET_WRITE_TOKEN + UPDATE_FEED_UPLOAD_URL",
    );
    process.exit(0);
  }
  // Upload windows feed to legacy URL by default
  const body = readFileSync(path.join(outDist, "windows", "stable.json"));
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
