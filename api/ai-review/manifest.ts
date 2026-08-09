/**
 * GET /api/ai-review/manifest — public HTTPS MACHINE-style JSON for remote agents.
 * Requires Authorization: Bearer <AI_REVIEW_AGENT_TOKEN> (Vercel env, never VITE_*).
 * Product surfaces only — no fixture portal.
 */
import { buildLiveAiReviewManifest } from "../../src/app/aiReview/liveManifest";

export const config = { runtime: "edge" };

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "WWW-Authenticate": 'Bearer realm="vybz-ai-review"',
    },
  });
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

function authorize(req: Request): boolean {
  const expected = process.env.AI_REVIEW_AGENT_TOKEN?.trim() ?? "";
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match?.[1]) return false;
  return timingSafeEqualString(match[1].trim(), expected);
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders() },
    });
  }

  if (!authorize(req)) {
    const res = unauthorized();
    for (const [k, v] of Object.entries(corsHeaders())) res.headers.set(k, v);
    return res;
  }

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const base = host ? `${proto}://${host}` : "https://vybz.cloud";
  const body = JSON.stringify(buildLiveAiReviewManifest(base), null, 2);

  return new Response(req.method === "HEAD" ? null : body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-VYBZ-AI-Review": "live-manifest",
      ...corsHeaders(),
    },
  });
}
