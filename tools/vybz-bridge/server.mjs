#!/usr/bin/env node
/**
 * Minimal VYBZ Bridge companion stub (K/H5).
 * Run: node tools/vybz-bridge/server.mjs
 * Listens on ws://127.0.0.1:17355 — logs hello/midi/file; replies pong.
 */
import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.VYBZ_BRIDGE_PORT || 17355);

const server = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("VYBZ Bridge companion stub\n");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("[bridge] client connected");
  ws.send(JSON.stringify({ type: "pong", ok: true }));

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(String(raw)); } catch {
      console.log("[bridge] non-json", String(raw).slice(0, 120));
      return;
    }
    if (msg.type === "hello") {
      console.log("[bridge] hello from", msg.client, "v" + msg.version);
      ws.send(JSON.stringify({ type: "pong", ok: true }));
    } else if (msg.type === "midi") {
      console.log("[bridge] midi notes:", Array.isArray(msg.notes) ? msg.notes.length : 0, msg.title || "");
    } else if (msg.type === "file") {
      console.log("[bridge] file meta:", msg.name, msg.size);
    } else {
      console.log("[bridge] msg", msg.type);
    }
  });

  ws.on("close", () => console.log("[bridge] client disconnected"));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`VYBZ Bridge listening on ws://127.0.0.1:${PORT}`);
});
