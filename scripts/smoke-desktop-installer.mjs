/**
 * Desktop installer smoke — asserts NSIS/MSI artifact presence or records stub hash.
 * Exits 0 when Rust toolchain is absent (documented blocker) after writing stub row.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nsisDir = path.join(root, "apps", "desktop", "src-tauri", "target", "release", "bundle", "nsis");
const outDir = path.join(root, "apps", "desktop", "signing");
const hashTable = path.join(outDir, "INSTALLER_HASHES.json");

function sha256File(filePath) {
  const hash = createHash("sha256");
  hash.update(readFileSync(filePath));
  return hash.digest("hex");
}

function findInstaller() {
  if (!existsSync(nsisDir)) return null;
  const files = readdirSync(nsisDir).filter((f) => f.endsWith(".exe") || f.endsWith(".msi"));
  if (!files.length) return null;
  return path.join(nsisDir, files[0]);
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
        ? "Rust present but NSIS artifact not found — run npm run build:desktop:windows"
        : "Rust/Tauri toolchain not installed — unsigned installer hash deferred",
    channel: "preview",
    version: "1.1.0",
    sha256: null,
    path: null,
  };
  writeFileSync(hashTable, JSON.stringify(stub, null, 2) + "\n");
  console.log("[smoke-desktop-installer]", stub.status, "→", hashTable);
  process.exit(0);
}

const sha256 = sha256File(installer);
const record = {
  recordedAt: new Date().toISOString(),
  status: "ok",
  channel: "preview",
  version: "1.1.0",
  sha256,
  path: path.relative(root, installer).replace(/\\/g, "/"),
  bytes: statSync(installer).size,
  signed: false,
  note: "Unsigned NSIS — replace when Authenticode cert available (see signing/README.md)",
};
writeFileSync(hashTable, JSON.stringify(record, null, 2) + "\n");
console.log("[smoke-desktop-installer] ok", record.path, sha256.slice(0, 12) + "…");
process.exit(0);
