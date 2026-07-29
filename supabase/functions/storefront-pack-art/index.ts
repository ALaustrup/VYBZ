// Supabase Edge Function: storefront-pack-art
// Authenticated POST { title, genre?, packId?, palette? }
// Generates SVG "box art", uploads to storefront-previews/{uid}/covers/,
// optionally patches storefront_packs.cover_path.
// Deploy with JWT verification ON.

import { admin, CORS, callerId, json } from "../_shared/edge.ts";

const BUCKET = "storefront-previews";

const PALETTES: Record<string, [string, string, string]> = {
  cyan: ["#061018", "#00c2ff", "#7ef0d8"],
  ember: ["#140808", "#ff6b4a", "#ffc48a"],
  violet: ["#0a0614", "#a78bfa", "#22d3ee"],
  mint: ["#061410", "#34d399", "#a7f3d0"],
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildSvg(title: string, genre: string, colors: [string, string, string]): string {
  const [bg, accent, soft] = colors;
  const t = esc(title.slice(0, 42));
  const g = esc((genre || "SAMPLE PACK").toUpperCase().slice(0, 28));
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="#02040a"/>
    </linearGradient>
    <linearGradient id="face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${soft}" stop-opacity="0.08"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="800" height="800" fill="url(#bg)"/>
  <polygon points="180,160 560,120 620,520 240,560" fill="url(#face)" stroke="${accent}" stroke-width="2" opacity="0.95"/>
  <polygon points="560,120 640,160 700,540 620,520" fill="${accent}" opacity="0.18" stroke="${soft}" stroke-width="1.5"/>
  <polygon points="240,560 620,520 700,540 320,600" fill="#000" opacity="0.35"/>
  <circle cx="620" cy="200" r="48" fill="none" stroke="${soft}" stroke-width="2" opacity="0.5" filter="url(#glow)"/>
  <text x="400" y="680" text-anchor="middle" fill="${soft}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="18" letter-spacing="6">${g}</text>
  <text x="400" y="730" text-anchor="middle" fill="#ffffff" font-family="ui-sans-serif,system-ui,sans-serif" font-size="36" font-weight="600">${t}</text>
  <text x="60" y="60" fill="${accent}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="14" letter-spacing="4" opacity="0.8">VYBZ PACKS</text>
</svg>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const uid = await callerId(req);
  if (!uid) return json({ error: "unauthorized" }, 401);

  let body: { title?: string; genre?: string; packId?: string; palette?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const title = String(body.title ?? "").trim().slice(0, 80);
  if (!title) return json({ error: "title required" }, 400);
  const genre = String(body.genre ?? "").trim().slice(0, 64);
  const paletteKey = String(body.palette ?? "cyan").toLowerCase();
  const colors = PALETTES[paletteKey] ?? PALETTES.cyan;

  const svg = buildSvg(title, genre, colors);
  const path = `${uid}/covers/${crypto.randomUUID()}.svg`;
  const bytes = new TextEncoder().encode(svg);

  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: "image/svg+xml",
    upsert: false,
  });
  if (upErr) {
    console.error("storefront-pack-art upload", upErr.message);
    return json({ error: "upload failed" }, 500);
  }

  const packId = body.packId ? String(body.packId) : "";
  if (packId) {
    await admin.from("storefront_packs")
      .update({ cover_path: path, updated_at: new Date().toISOString() })
      .eq("id", packId)
      .eq("user_id", uid);
  }

  return json({ coverPath: path });
});
