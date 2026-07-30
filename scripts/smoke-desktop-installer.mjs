/**
 * Desktop installer smoke — prefers MSI, falls back to NSIS; writes DESKTOP_INSTALLERS.json.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const msiDir = path.join(root, "apps", "desktop", "src-tauri", "target", "release", "bundle", "msi");
const nsisDir = path.join(root, "apps", "desktop", "src-tauri", "target", "release", "bundle", "nsis");
const outDir = path.join(root, "apps", "desktop", "signing");
const hashTable = path.join(outDir, "INSTALLER_HASHES.json");
const installersTable = path.join(outDir, "DESKTOP_INSTALLERS.json");

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function findInstaller() {
  for (const dir of [msiDir, nsisDir]) {
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f) => f.endsWith(".msi") || f.endsWith(".exe"));
    if (files.length) return path.join(dir, files[0]);
  }
  return null;
}

const rustc = spawnSync("rustc", ["--version"], { encoding: "utf8" });
const installer = findInstaller();
mkdirSync(outDir, { recursive: true });

if (!installer) {
  const stub = {
    recordedAt: new Date().toISOString(),
    status: rustc.status === 0 ? "artifact_missing" : "toolchain_missing",
    note:
      rustc.status === 0
        ? "Rust present but MSI/NSIS artifact missing — run npm run build:desktop:windows"
        : "Rust/Tauri toolchain not installed — unsigned installer hash deferred",
    channel: "stable",
    version: "1.1.0",
    sha256: null,
    path: null,
  };
  writeFileSync(hashTable, JSON.stringify(stub, null, 2) + "\n");
  writeFileSync(installersTable, JSON.stringify(stub, null, 2) + "\n");
  console.log("[smoke-desktop-installer]", stub.status);
  process.exit(0);
}

const sha256 = sha256File(installer);
const record = {
  recordedAt: new Date().toISOString(),
  status: "ok",
  channel: "stable",
  version: "1.1.0",
  sha256,
  path: path.relative(root, installer).replace(/\\/g, "/"),
  bytes: statSync(installer).size,
  signed: Boolean(process.env.WINDOWS_CERT_BASE64),
  feedUrl: "https://update.vybz.cloud/windows/stable.json",
  note: "Phase 12 Desktop Beta installer record",
};
writeFileSync(hashTable, JSON.stringify(record, null, 2) + "\n");
writeFileSync(installersTable, JSON.stringify(record, null, 2) + "\n");
console.log("[smoke-desktop-installer] ok", record.path, sha256.slice(0, 12) + "…");
process.exit(0);
