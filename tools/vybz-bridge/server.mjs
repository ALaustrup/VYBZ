#!/usr/bin/env node
/**
 * VYBZ Bridge companion (Music Repos R4 / H5).
 *
 * Run: npm start  (from tools/vybz-bridge)
 * Listens on ws://127.0.0.1:17355
 *
 * Protocol (JSON messages):
 *   hello { client, version }           → pong
 *   watch { path, projectId?, debounceMs?, autoCommit? }
 *     Start watching a DAW project folder. Debounced change events →
 *     `folder-changed` to the client; if autoCommit, also `commit-ready`.
 *   unwatch { path? }                   → stop watchers
 *   status                              → list of active watches
 *   commit-ack { path, message? }       → ack after web/app finished sync
 *   midi / file                         → logged (legacy H5 stubs)
 *
 * The Bridge never holds Supabase secrets. The web session performs CAS
 * upload + repo_commit; Bridge only detects saves and prompts commits.
 */
import { createServer } from "node:http";
import { watch, existsSync, statSync } from "node:fs";
import { resolve, normalize } from "node:path";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.VYBZ_BRIDGE_PORT || 17355);
const DEFAULT_DEBOUNCE_MS = 2500;

/** @type {Map<string, { watcher: import('node:fs').FSWatcher, clients: Set<import('ws').WebSocket>, projectId: string|null, debounceMs: number, autoCommit: boolean, timer: NodeJS.Timeout|null, lastChange: number }>} */
const watches = new Map();

function send(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function broadcast(pathKey, obj) {
  const w = watches.get(pathKey);
  if (!w) return;
  for (const c of w.clients) send(c, obj);
}

function stopWatch(pathKey) {
  const w = watches.get(pathKey);
  if (!w) return;
  try { w.watcher.close(); } catch { /* ignore */ }
  if (w.timer) clearTimeout(w.timer);
  watches.delete(pathKey);
}

function scheduleNotify(pathKey) {
  const w = watches.get(pathKey);
  if (!w) return;
  w.lastChange = Date.now();
  if (w.timer) clearTimeout(w.timer);
  w.timer = setTimeout(() => {
    w.timer = null;
    const payload = {
      type: "folder-changed",
      path: pathKey,
      projectId: w.projectId,
      at: w.lastChange,
    };
    broadcast(pathKey, payload);
    if (w.autoCommit) {
      broadcast(pathKey, {
        type: "commit-ready",
        path: pathKey,
        projectId: w.projectId,
        message: `Autosave · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        at: Date.now(),
      });
    }
  }, w.debounceMs);
}

function startWatch(ws, msg) {
  const raw = typeof msg.path === "string" ? msg.path.trim() : "";
  if (!raw) {
    send(ws, { type: "error", error: "path required" });
    return;
  }
  let abs;
  try {
    abs = normalize(resolve(raw));
  } catch {
    send(ws, { type: "error", error: "invalid path" });
    return;
  }
  if (!existsSync(abs) || !statSync(abs).isDirectory()) {
    send(ws, { type: "error", error: "not a directory", path: abs });
    return;
  }

  let entry = watches.get(abs);
  if (!entry) {
    try {
      const watcher = watch(abs, { recursive: true }, (_event, filename) => {
        // Ignore noisy Ableton/FL cache churn by name when possible
        const name = String(filename || "");
        if (/\.asd$/i.test(name)) return;
        if (/Ableton Project Info/i.test(name)) return;
        if (/Backup/i.test(name) && /Backup/i.test(abs + "/" + name)) return;
        scheduleNotify(abs);
      });
      entry = {
        watcher,
        clients: new Set(),
        projectId: msg.projectId ?? null,
        debounceMs: Math.max(500, Number(msg.debounceMs) || DEFAULT_DEBOUNCE_MS),
        autoCommit: !!msg.autoCommit,
        timer: null,
        lastChange: 0,
      };
      watches.set(abs, entry);
      console.log("[bridge] watching", abs);
    } catch (e) {
      send(ws, { type: "error", error: String(e?.message || e) });
      return;
    }
  } else {
    entry.projectId = msg.projectId ?? entry.projectId;
    if (msg.debounceMs) entry.debounceMs = Math.max(500, Number(msg.debounceMs));
    if (typeof msg.autoCommit === "boolean") entry.autoCommit = msg.autoCommit;
  }
  entry.clients.add(ws);
  send(ws, {
    type: "watching",
    path: abs,
    projectId: entry.projectId,
    debounceMs: entry.debounceMs,
    autoCommit: entry.autoCommit,
  });
}

function detachClient(ws) {
  for (const [pathKey, entry] of watches) {
    entry.clients.delete(ws);
    if (entry.clients.size === 0) {
      stopWatch(pathKey);
      console.log("[bridge] stopped watch", pathKey);
    }
  }
}

const server = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(
    "VYBZ Bridge — Music Repos folder watch\n" +
      `Active watches: ${watches.size}\n` +
      "WebSocket: ws://127.0.0.1:" + PORT + "\n",
  );
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("[bridge] client connected");
  send(ws, { type: "pong", ok: true, protocol: "repo-watch-v1" });

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      console.log("[bridge] non-json", String(raw).slice(0, 120));
      return;
    }

    switch (msg.type) {
      case "hello":
        console.log("[bridge] hello from", msg.client, "v" + msg.version);
        send(ws, { type: "pong", ok: true, protocol: "repo-watch-v1" });
        break;
      case "watch":
        startWatch(ws, msg);
        break;
      case "unwatch": {
        const key = msg.path ? normalize(resolve(msg.path)) : null;
        if (key && watches.has(key)) {
          watches.get(key).clients.delete(ws);
          if (watches.get(key).clients.size === 0) stopWatch(key);
          send(ws, { type: "unwatched", path: key });
        } else if (!key) {
          detachClient(ws);
          send(ws, { type: "unwatched", all: true });
        }
        break;
      }
      case "status":
        send(ws, {
          type: "status",
          watches: [...watches.entries()].map(([path, w]) => ({
            path,
            projectId: w.projectId,
            clients: w.clients.size,
            autoCommit: w.autoCommit,
            debounceMs: w.debounceMs,
          })),
        });
        break;
      case "commit-ack":
        console.log("[bridge] commit-ack", msg.path, msg.message || "");
        send(ws, { type: "commit-acked", path: msg.path, ok: true });
        break;
      case "midi":
        console.log("[bridge] midi notes:", Array.isArray(msg.notes) ? msg.notes.length : 0, msg.title || "");
        break;
      case "file":
        console.log("[bridge] file meta:", msg.name, msg.size);
        break;
      default:
        console.log("[bridge] msg", msg.type);
    }
  });

  ws.on("close", () => {
    detachClient(ws);
    console.log("[bridge] client disconnected");
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`VYBZ Bridge listening on ws://127.0.0.1:${PORT}`);
});
