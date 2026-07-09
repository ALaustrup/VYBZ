// VYBZ C2PA worker — a tiny Node HTTP service that signs delivered audio with a
// C2PA manifest. Intended to run right after the watermark step in the delivery
// pipeline (watermark → C2PA), on any Node host/container.
//
// Env:
//   PORT               (default 8787)
//   WORKER_TOKEN       shared bearer token clients must present
//   C2PA_SIGN_CERT     ES256 certificate chain (PEM)
//   C2PA_PRIVATE_KEY   ES256 private key (PEM)
//   C2PATOOL_BIN       path to the c2patool binary
//
// POST /sign
//   headers: Authorization: Bearer <WORKER_TOKEN>
//            x-vybz-meta: <base64 JSON { assetId, recipient, watermarkId, license, title, author }>
//   body:    the (watermarked) audio bytes
//   → 200 with the C2PA-signed audio bytes

import { createServer } from "node:http";
import { signAudio } from "./sign.mjs";

const PORT = Number(process.env.PORT || 8787);
const TOKEN = process.env.WORKER_TOKEN || "";
const certPem = process.env.C2PA_SIGN_CERT || "";
const keyPem = process.env.C2PA_PRIVATE_KEY || "";

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

createServer(async (req, res) => {
  // Health check (GET / or /healthz) — lets hosts detect the service is up.
  if (req.method === "GET" && (req.url === "/" || req.url?.startsWith("/healthz"))) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ service: "vybz-c2pa", ok: true, signer: certPem && keyPem ? "configured" : "missing" }));
    return;
  }
  if (req.method !== "POST" || !req.url?.startsWith("/sign")) {
    res.writeHead(404).end("not found");
    return;
  }
  if (!TOKEN || req.headers.authorization !== `Bearer ${TOKEN}`) {
    res.writeHead(401).end("unauthorized");
    return;
  }
  if (!certPem || !keyPem) {
    res.writeHead(500).end("signer not configured");
    return;
  }
  try {
    const meta = JSON.parse(Buffer.from(String(req.headers["x-vybz-meta"] || ""), "base64").toString() || "{}");
    const audio = await readBody(req);
    const signed = await signAudio(audio, meta, { certPem, keyPem, ext: "wav" });
    res.writeHead(200, { "Content-Type": "audio/wav" });
    res.end(signed);
  } catch (e) {
    res.writeHead(500).end(`sign failed: ${e?.message ?? e}`);
  }
}).listen(PORT, () => console.log(`VYBZ C2PA worker on :${PORT}`));
