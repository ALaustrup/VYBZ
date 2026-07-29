/**
 * Deterministic e2e entry for Suite Genesis Phase 1.1.
 *
 * 1. Ensure production `dist/` exists (build unless PLAYWRIGHT_SKIP_BUILD=1)
 * 2. Start Vite preview on 127.0.0.1:4173 (--strictPort)
 * 3. Wait for http://127.0.0.1:4173/index.html (finite timeout)
 * 4. Run Playwright with PLAYWRIGHT_SKIP_WEBSERVER=1
 * 5. Always tear down the preview process
 *
 * Preview stdout/stderr are captured and printed on failure or timeout.
 * Invokes Playwright via `node …/cli.js` (not `npx`) to avoid Windows hangs.
 */
import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distIndex = path.join(root, "dist", "index.html");
const playwrightCli = path.join(root, "node_modules", "@playwright", "test", "cli.js");
const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js");
const PREVIEW_HOST = "127.0.0.1";
const PREVIEW_PORT = 4173;
const PREVIEW_READY_URL = `http://${PREVIEW_HOST}:${PREVIEW_PORT}/index.html`;
const PREVIEW_START_TIMEOUT_MS = 60_000;
const PREVIEW_POLL_MS = 250;

const skipBuild = process.env.PLAYWRIGHT_SKIP_BUILD === "1";

function log(msg) {
  console.log(`[e2e] ${msg}`);
}

function runSync(command, args, opts = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    env: process.env,
    ...opts,
  });
  if (result.error) {
    console.error(`[e2e] failed to spawn ${command}:`, result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function waitForUrl(url, timeoutMs, getLogs) {
  const start = Date.now();
  let lastErr = "";
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (res.ok) return;
      lastErr = `HTTP ${res.status}`;
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
    }
    await new Promise((r) => setTimeout(r, PREVIEW_POLL_MS));
  }
  const logs = getLogs();
  console.error(`[e2e] Preview did not become ready at ${url} within ${timeoutMs}ms.`);
  console.error(`[e2e] Last probe error: ${lastErr}`);
  if (logs.stdout) {
    console.error("[e2e] --- preview stdout ---");
    console.error(logs.stdout);
  }
  if (logs.stderr) {
    console.error("[e2e] --- preview stderr ---");
    console.error(logs.stderr);
  }
  process.exit(1);
}

function startPreview() {
  if (!existsSync(viteBin)) {
    console.error(`[e2e] Vite binary missing at ${viteBin}`);
    process.exit(1);
  }
  const stdoutChunks = [];
  const stderrChunks = [];
  const child = spawn(
    process.execPath,
    [
      viteBin,
      "preview",
      "--host",
      PREVIEW_HOST,
      "--port",
      String(PREVIEW_PORT),
      "--strictPort",
    ],
    {
      cwd: root,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  child.stdout.on("data", (buf) => {
    stdoutChunks.push(buf);
    process.stdout.write(buf);
  });
  child.stderr.on("data", (buf) => {
    stderrChunks.push(buf);
    process.stderr.write(buf);
  });
  child.on("error", (err) => {
    console.error("[e2e] preview spawn error:", err.message);
  });
  return {
    child,
    getLogs: () => ({
      stdout: Buffer.concat(stdoutChunks).toString("utf8"),
      stderr: Buffer.concat(stderrChunks).toString("utf8"),
    }),
  };
}

function stopPreview(child) {
  return new Promise((resolve) => {
    if (!child || child.killed || child.exitCode !== null) {
      resolve();
      return;
    }
    const done = () => resolve();
    child.once("exit", done);
    child.once("close", done);
    try {
      child.kill("SIGTERM");
    } catch {
      /* ignore */
    }
    setTimeout(() => {
      if (child.exitCode === null && !child.killed) {
        try {
          child.kill("SIGKILL");
        } catch {
          /* ignore */
        }
      }
      resolve();
    }, 5_000).unref?.();
  });
}

async function main() {
  if (!existsSync(playwrightCli)) {
    console.error(`[e2e] Playwright CLI missing at ${playwrightCli}`);
    process.exit(1);
  }

  if (skipBuild) {
    if (!existsSync(distIndex)) {
      console.error(
        "[e2e] PLAYWRIGHT_SKIP_BUILD=1 but dist/index.html is missing. Run npm run build first.",
      );
      process.exit(1);
    }
    log("using existing dist/ (PLAYWRIGHT_SKIP_BUILD=1)");
  } else {
    log("building production dist/…");
    runSync("npm", ["run", "build"], { shell: true });
    if (!existsSync(distIndex)) {
      console.error("[e2e] build finished but dist/index.html is still missing.");
      process.exit(1);
    }
  }

  log(`starting preview → ${PREVIEW_READY_URL}`);
  const { child: preview, getLogs } = startPreview();

  let exitCode = 1;
  try {
    await waitForUrl(PREVIEW_READY_URL, PREVIEW_START_TIMEOUT_MS, getLogs);
    log("preview ready");

    const env = {
      ...process.env,
      PLAYWRIGHT_SKIP_WEBSERVER: "1",
      PLAYWRIGHT_BASE_URL: `http://${PREVIEW_HOST}:${PREVIEW_PORT}`,
    };
    log("running Playwright smoke…");
    const result = spawnSync(
      process.execPath,
      [playwrightCli, "test", "--config=playwright.config.cjs", ...process.argv.slice(2)],
      { cwd: root, stdio: "inherit", env, shell: false },
    );
    if (result.error) {
      console.error("[e2e] Playwright spawn error:", result.error.message);
      console.error("[e2e] --- preview stdout ---");
      console.error(getLogs().stdout);
      console.error("[e2e] --- preview stderr ---");
      console.error(getLogs().stderr);
      exitCode = 1;
    } else {
      exitCode = result.status ?? 1;
      if (exitCode !== 0) {
        console.error("[e2e] Playwright failed; dumping preview logs.");
        console.error("[e2e] --- preview stdout ---");
        console.error(getLogs().stdout);
        console.error("[e2e] --- preview stderr ---");
        console.error(getLogs().stderr);
      }
    }
  } finally {
    log("stopping preview…");
    await stopPreview(preview);
    log("preview stopped");
  }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error("[e2e] unexpected failure:", err);
  process.exit(1);
});
