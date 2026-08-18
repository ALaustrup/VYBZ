/**
 * Talks to a running VLink node the same way the VYBZ web client does.
 * Usage: node native/vlink/probe.mjs
 */
const URL = "ws://127.0.0.1:48480/vybz-stream";
const MAGIC = [0x56, 0x59, 0x42, 0x5a];

function decodePcm(buf) {
  const u8 = new Uint8Array(buf);
  if (u8.byteLength < 16) return null;
  if (u8[0] !== MAGIC[0] || u8[1] !== MAGIC[1] || u8[2] !== MAGIC[2] || u8[3] !== MAGIC[3]) return null;
  if (u8[4] !== 1 || u8[5] !== 2) return null;
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const sampleRate = view.getUint32(8, true);
  const frameCount = view.getUint32(12, true);
  if (sampleRate < 8000 || frameCount < 1 || frameCount > 8192) return null;
  const need = 16 + frameCount * 8;
  if (u8.byteLength < need) return null;
  return { sampleRate, frameCount };
}

const got = { hello: false, status: false, pcm: false, meter: false, pong: false, httpInfo: false };
const errors = [];
let finished = false;

try {
  const http = await fetch("http://127.0.0.1:48480/v1/info");
  const info = await http.json();
  if (info?.plugin === "VLink" && info.doesNotEnumerateProject === true) got.httpInfo = true;
  else errors.push("http /v1/info missing VLink fields");
} catch (e) {
  errors.push(`http /v1/info failed: ${e.message}`);
}

const ws = new WebSocket(URL);
const timer = setTimeout(() => {
  errors.push("timeout waiting for hello + pcm");
  finish();
}, 4000);

function finish() {
  if (finished) return;
  finished = true;
  clearTimeout(timer);
  try { ws.close(); } catch { /* ignore */ }
  // Existing VYBZ client needs hello + framed PCM. Ping/meter are extras.
  const ok = got.hello && got.status && got.pcm && !errors.some((e) => e.startsWith("timeout") || e.startsWith("pcm"));
  console.log(JSON.stringify({ ok, got, errors }, null, 2));
  process.exit(ok ? 0 : 1);
}

ws.addEventListener("open", () => {
  ws.send(JSON.stringify({ type: "ping" }));
  ws.send(JSON.stringify({ type: "telemetry", listeners: null, sparksCount: null }));
});

ws.addEventListener("message", async (ev) => {
  if (typeof ev.data === "string") {
    let msg;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      errors.push("non-json text");
      return;
    }
    if (msg.type === "hello" && msg.info?.pluginFormat === "vst3" && msg.info?.sampleRate && msg.info?.channels === 2) {
      got.hello = true;
    }
    if (msg.type === "status" && (msg.status === "connected" || msg.status === "streaming")) got.status = true;
    if (msg.type === "meter" && Number.isFinite(msg.meter?.peakL)) got.meter = true;
    if (msg.type === "pong") got.pong = true;
  } else {
    const buf = ev.data instanceof ArrayBuffer ? ev.data : await ev.data.arrayBuffer();
    const frame = decodePcm(buf);
    if (frame) got.pcm = true;
    else errors.push("pcm frame rejected");
  }
  if (got.hello && got.status && got.pcm && got.pong) finish();
  else if (got.hello && got.status && got.pcm) setTimeout(finish, 250);
});

ws.addEventListener("error", () => {
  if (!got.hello) errors.push("websocket error — is VLinkNode or the VST3 listening on 48480?");
});

