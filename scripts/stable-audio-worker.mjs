/**
 * Local Stable Audio 3 worker. Loopback only.
 * The SPA never loads the model. Start with: npm run generate:worker
 *
 * Expects the MIT inference clone at ../stable-audio-3 (sibling of this repo)
 * or VYBZ_STABLE_AUDIO_3. Weights are Stability Community License.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.VYBZ_SA3_PORT || 48481);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SA3 = process.env.VYBZ_STABLE_AUDIO_3 || path.resolve(ROOT, "..", "stable-audio-3");
const UV = process.platform === "win32" ? "uv.exe" : "uv";
const MODEL = "small-music";
const MIN_SEC = 4;
const MAX_SEC = 30;

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function json(res, status, body) {
  cors(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function clampDuration(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 15;
  return Math.min(MAX_SEC, Math.max(MIN_SEC, Math.round(x)));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function runCli(prompt, durationSec, seed, outWav) {
  return new Promise((resolve, reject) => {
    const args = [
      "run",
      "stable-audio",
      "--model",
      MODEL,
      "-p",
      prompt,
      "--duration",
      String(durationSec),
      "-o",
      outWav,
      "--seed",
      String(seed),
    ];
    const child = spawn(UV, args, {
      cwd: SA3,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let err = "";
    child.stderr.on("data", (d) => {
      err += d.toString();
    });
    child.on("error", (e) => {
      reject(new Error(`Could not start uv: ${e.message}. Install uv and run uv sync in ${SA3}.`));
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err.trim() || `stable-audio exited ${code}`));
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }
  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
  if (req.method === "GET" && url.pathname === "/v1/health") {
    json(res, 200, {
      ok: true,
      model: MODEL,
      sa3Present: existsSync(path.join(SA3, "pyproject.toml")),
      sa3Root: SA3,
    });
    return;
  }
  if (req.method !== "POST" || url.pathname !== "/v1/generate") {
    json(res, 404, { error: "not_found" });
    return;
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    json(res, 400, { error: "invalid_json" });
    return;
  }
  const prompt = String(body.prompt || "").trim().slice(0, 500);
  if (!prompt) {
    json(res, 400, { error: "Write a prompt first." });
    return;
  }
  if (!existsSync(path.join(SA3, "pyproject.toml"))) {
    json(res, 503, {
      error: `Stable Audio 3 is not at ${SA3}. Clone it as a sibling of VYBZ or set VYBZ_STABLE_AUDIO_3.`,
    });
    return;
  }

  const durationSec = clampDuration(body.durationSec);
  const seed = Number.isFinite(Number(body.seed)) ? Math.floor(Number(body.seed)) : Math.floor(Math.random() * 1e9);
  const dir = await mkdtemp(path.join(os.tmpdir(), "vybz-sa3-"));
  const outWav = path.join(dir, "out.wav");
  try {
    await runCli(prompt, durationSec, seed, outWav);
    const wav = await readFile(outWav);
    cors(res);
    res.writeHead(200, {
      "Content-Type": "audio/wav",
      "Content-Length": String(wav.length),
      "X-SA3-Model": MODEL,
      "X-SA3-Seed": String(seed),
    });
    res.end(wav);
  } catch (err) {
    json(res, 503, { error: err instanceof Error ? err.message : "generate_failed" });
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`VYBZ Stable Audio worker on http://127.0.0.1:${PORT}  (SA3=${SA3})`);
});
