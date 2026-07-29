import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = { ...process.env, ANALYZE: "1" };
const result = spawnSync("npx", ["vite", "build"], {
  cwd: root,
  stdio: "inherit",
  env,
  shell: true,
});
process.exit(result.status ?? 1);
