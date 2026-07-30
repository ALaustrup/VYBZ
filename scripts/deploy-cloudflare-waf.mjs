/**
 * Deploy docs/security/cloudflare-ruleset.yml to the vybz.cloud zone.
 *
 * Requires CLOUDFLARE_API_TOKEN with:
 *   Zone → Zone WAF → Edit
 *   Zone → Zone → Read
 * Resource: include zone vybz.cloud
 *
 * Usage:
 *   $env:CLOUDFLARE_API_TOKEN="…"
 *   $env:CLOUDFLARE_ZONE_ID="6d2cfa9236d98325b89e1f71f82b55e0"  # optional
 *   node scripts/deploy-cloudflare-waf.mjs
 */
import process from "node:process";

const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID || "6d2cfa9236d98325b89e1f71f82b55e0";
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const API = "https://api.cloudflare.com/client/v4";

if (!TOKEN) {
  console.error("Missing CLOUDFLARE_API_TOKEN (needs Zone WAF Edit on vybz.cloud).");
  process.exit(1);
}

/** YAML `allow` → Ruleset Engine `skip` (skip remaining custom rules only). */
const rules = [
  {
    ref: "allow_spa_routes",
    description: "Allow SPA assets and HTML",
    action: "skip",
    enabled: true,
    action_parameters: { ruleset: "current" },
    expression:
      '(http.request.method in {"GET" "HEAD"}) and (http.request.uri.path in {"/" "/enter"} or starts_with(http.request.uri.path, "/pack/") or starts_with(http.request.uri.path, "/assets/") or ends_with(http.request.uri.path, ".js") or ends_with(http.request.uri.path, ".css") or ends_with(http.request.uri.path, ".ico") or ends_with(http.request.uri.path, ".svg") or ends_with(http.request.uri.path, ".png") or ends_with(http.request.uri.path, ".webp"))',
  },
  {
    ref: "allow_edge_functions",
    description: "Allow Supabase Edge Functions",
    action: "skip",
    enabled: true,
    action_parameters: { ruleset: "current" },
    expression: 'starts_with(http.request.uri.path, "/functions/v1/")',
  },
  {
    ref: "block_lfi",
    description: "Block path traversal and encoded LFI",
    action: "block",
    enabled: true,
    // Free plan: no `matches` (regex). Use `contains` only.
    expression:
      'http.request.uri.path contains "../" or http.request.uri.query contains "../" or http.request.uri.path contains "%2e%2e" or http.request.uri.path contains "%252e%252e" or http.request.uri.query contains "%2e%2e" or http.request.uri.query contains "%252e%252e"',
  },
  {
    ref: "block_proto_pollution",
    description: "Block __proto__ query probes",
    action: "block",
    enabled: true,
    expression: 'http.request.uri.query contains "__proto__"',
  },
];

async function cf(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, ...json };
}

const entryPath = `/zones/${ZONE_ID}/rulesets/phases/http_request_firewall_custom/entrypoint`;

const existing = await cf("GET", entryPath);
if (existing.success && existing.result?.id) {
  const updated = await cf("PUT", entryPath, {
    description: "Protect VYBZ SPA routes and Supabase Edge Functions",
    rules,
  });
  if (!updated.success) {
    console.error("PUT entrypoint failed", updated.status, updated.errors);
    process.exit(1);
  }
  console.log(
    JSON.stringify(
      {
        mode: "update_entrypoint",
        id: updated.result.id,
        name: updated.result.name,
        phase: updated.result.phase,
        version: updated.result.version,
        rules: (updated.result.rules || []).map((r) => ({
          id: r.id,
          ref: r.ref,
          action: r.action,
          description: r.description,
        })),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const created = await cf("POST", `/zones/${ZONE_ID}/rulesets`, {
  name: "vybz-cloud-spa-edge",
  description: "Protect VYBZ SPA routes and Supabase Edge Functions",
  kind: "zone",
  phase: "http_request_firewall_custom",
  rules,
});

if (!created.success) {
  // Fallback: empty entrypoint create via PUT (CF creates it)
  const put = await cf("PUT", entryPath, {
    rules,
  });
  if (!put.success) {
    console.error("Create failed", created.status, created.errors);
    console.error("PUT fallback failed", put.status, put.errors);
    process.exit(1);
  }
  console.log(
    JSON.stringify(
      {
        mode: "put_entrypoint",
        id: put.result.id,
        phase: put.result.phase,
        version: put.result.version,
        rules: (put.result.rules || []).map((r) => ({
          id: r.id,
          ref: r.ref,
          action: r.action,
          description: r.description,
        })),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

console.log(
  JSON.stringify(
    {
      mode: "create_ruleset",
      id: created.result.id,
      name: created.result.name,
      phase: created.result.phase,
      version: created.result.version,
      rules: (created.result.rules || []).map((r) => ({
        id: r.id,
        ref: r.ref,
        action: r.action,
        description: r.description,
      })),
    },
    null,
    2,
  ),
);
