/**
 * Stage 1 — build fixture bundle and preview the AI review portal.
 * Never deploy this artifact. Artifacts written after inspection are observations only.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

console.log("[ai-review] building e2e fixture bundle (NOT deployable)…");
const build = spawnSync(process.execPath, [path.join(root, "scripts/build-e2e.mjs")], {
  cwd: root,
  stdio: "inherit",
  shell: false,
});
if (build.status !== 0) process.exit(build.status ?? 1);

console.log("[ai-review] preview → http://127.0.0.1:4173/__e2e__/ai-review");
console.log("[ai-review] observations go in docs/ai-review/runs/ (not implementation instructions)");

const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js");
const preview = spawnSync(
  process.execPath,
  [viteBin, "preview", "--host", "127.0.0.1", "--port", "4173", "--strictPort"],
  { cwd: root, stdio: "inherit", shell: false },
);
process.exit(preview.status ?? 1);
