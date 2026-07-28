#!/usr/bin/env node
/**
 * Configure VYBZ outbound email on **vybz.cloud** via Resend + (optional) GoDaddy DNS.
 *
 * Steps this script can run:
 *   1. Create (or reuse) Resend domain `vybz.cloud`
 *   2. Print required DNS records
 *   3. Optionally write those records to GoDaddy (vybz.cloud is on domaincontrol NS)
 *   4. Trigger Resend verification + poll until verified (or timeout)
 *   5. Set Supabase Edge secret RESEND_FROM + Auth SMTP sender to noreply@vybz.cloud
 *
 * Required:
 *   RESEND_API_KEY=re_...
 *
 * Optional:
 *   GODADDY_API_KEY / GODADDY_API_SECRET  — auto-apply DNS
 *   SUPABASE_ACCESS_TOKEN                 — Auth SMTP + (via CLI) edge secrets
 *   SUPABASE_PROJECT_REF                  — default xixmneooyufbeftdfpcm
 *   APPLY_DNS=1                           — write GoDaddy records (default 0 = print only)
 *   WAIT_VERIFY=1                         — poll Resend until verified (default 1)
 *   SKIP_SUPABASE=1                       — don't touch Auth SMTP / secrets
 *
 * Usage (PowerShell):
 *   $env:RESEND_API_KEY="re_..."
 *   $env:GODADDY_API_KEY="..."; $env:GODADDY_API_SECRET="..."
 *   $env:SUPABASE_ACCESS_TOKEN="sbp_..."
 *   $env:APPLY_DNS="1"
 *   node scripts/configure-vybz-cloud-email.mjs
 */
import { spawnSync } from "node:child_process";

const DOMAIN = process.env.EMAIL_DOMAIN ?? "vybz.cloud";
const FROM_EMAIL = process.env.SMTP_SENDER_EMAIL ?? `noreply@${DOMAIN}`;
const FROM_NAME = process.env.SMTP_SENDER_NAME ?? "VYBZ";
const RESEND_FROM = process.env.RESEND_FROM ?? `${FROM_NAME} <${FROM_EMAIL}>`;
const REF = process.env.SUPABASE_PROJECT_REF ?? "xixmneooyufbeftdfpcm";
const APPLY_DNS = process.env.APPLY_DNS === "1";
const WAIT_VERIFY = process.env.WAIT_VERIFY !== "0";
const SKIP_SUPABASE = process.env.SKIP_SUPABASE === "1";

const RESEND_KEY = process.env.RESEND_API_KEY;
if (!RESEND_KEY) {
  console.error("Missing RESEND_API_KEY");
  process.exit(1);
}

const resendHeaders = {
  Authorization: `Bearer ${RESEND_KEY}`,
  "Content-Type": "application/json",
};

async function resend(path, opts = {}) {
  const res = await fetch(`https://api.resend.com${path}`, {
    ...opts,
    headers: { ...resendHeaders, ...(opts.headers ?? {}) },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`Resend ${opts.method ?? "GET"} ${path} → ${res.status}`);
    err.body = body;
    err.status = res.status;
    throw err;
  }
  return body;
}

function recordHost(name) {
  // Resend may return "send", "resend._domainkey", or FQDN.
  const n = (name ?? "").replace(/\.$/, "");
  if (!n || n === DOMAIN || n === "@") return "@";
  if (n.endsWith(`.${DOMAIN}`)) return n.slice(0, -(DOMAIN.length + 1)) || "@";
  return n;
}

async function ensureDomain() {
  const list = await resend("/domains");
  const existing = (list?.data ?? []).find((d) => d.name === DOMAIN);
  if (existing) {
    console.log(`✓ Resend domain exists: ${DOMAIN} (${existing.id}) status=${existing.status}`);
    const detail = await resend(`/domains/${existing.id}`);
    return detail;
  }
  console.log(`Creating Resend domain ${DOMAIN}…`);
  const created = await resend("/domains", {
    method: "POST",
    body: JSON.stringify({ name: DOMAIN }),
  });
  console.log(`✓ Created ${DOMAIN} (${created.id}) status=${created.status}`);
  return created;
}

function printRecords(domain) {
  const records = domain.records ?? [];
  console.log("\n── DNS records to add at GoDaddy (vybz.cloud) ──");
  for (const r of records) {
    const host = recordHost(r.name);
    console.log(
      `  ${String(r.type).padEnd(6)} host=${host.padEnd(28)} value=${r.value}` +
        (r.priority != null ? ` priority=${r.priority}` : "") +
        (r.status ? ` [${r.status}]` : ""),
    );
  }
  console.log("");
  return records;
}

async function applyGoDaddy(records) {
  const key = process.env.GODADDY_API_KEY;
  const secret = process.env.GODADDY_API_SECRET;
  if (!key || !secret) {
    console.error("APPLY_DNS=1 but GODADDY_API_KEY / GODADDY_API_SECRET missing");
    process.exit(1);
  }
  const auth = `sso-key ${key}:${secret}`;
  const base = `https://api.godaddy.com/v1/domains/${DOMAIN}/records`;

  for (const r of records) {
    const type = String(r.type).toUpperCase();
    if (!["TXT", "MX", "CNAME"].includes(type)) {
      console.warn(`  skip unsupported type ${type}`);
      continue;
    }
    const host = recordHost(r.name);
    const body = [
      {
        type,
        name: host === "@" ? "@" : host,
        data: r.value,
        ttl: 600,
        ...(type === "MX" && r.priority != null ? { priority: Number(r.priority) } : {}),
      },
    ];
    // PUT replaces all records of this type+name — Resend needs exact match.
    const url = `${base}/${type}/${encodeURIComponent(host === "@" ? "@" : host)}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`GoDaddy PUT ${type}/${host} failed (${res.status}):`, await res.text());
      process.exit(1);
    }
    console.log(`✓ GoDaddy ${type} ${host}`);
  }
}

async function waitVerified(domainId) {
  console.log("Triggering Resend verification…");
  try {
    await resend(`/domains/${domainId}/verify`, { method: "POST" });
  } catch (e) {
    console.warn("verify trigger:", e.body ?? e.message);
  }
  const deadline = Date.now() + 12 * 60 * 1000;
  while (Date.now() < deadline) {
    const d = await resend(`/domains/${domainId}`);
    console.log(`  status=${d.status}`);
    if (d.status === "verified") {
      console.log("✓ Domain verified on Resend");
      return true;
    }
    await new Promise((r) => setTimeout(r, 15_000));
  }
  console.warn("! Still not verified after ~12m — DNS may still be propagating. Re-run later.");
  return false;
}

async function configureSupabaseAuth() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.warn("! SUPABASE_ACCESS_TOKEN missing — skip Auth SMTP");
    return;
  }
  const body = {
    smtp_admin_email: FROM_EMAIL,
    smtp_host: "smtp.resend.com",
    smtp_port: "465",
    smtp_user: "resend",
    smtp_pass: RESEND_KEY,
    smtp_sender_name: FROM_NAME,
    rate_limit_email_sent: 100,
  };
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/config/auth`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`Auth SMTP failed (${res.status}):`, await res.text());
    process.exit(1);
  }
  console.log(`✓ Supabase Auth SMTP → ${FROM_NAME} <${FROM_EMAIL}>`);
}

function setEdgeSecret() {
  console.log(`Setting Edge secret RESEND_FROM=${RESEND_FROM}`);
  const r = spawnSync(
    "npx",
    ["supabase", "secrets", "set", `RESEND_FROM=${RESEND_FROM}`, "--project-ref", REF],
    { encoding: "utf8", shell: true },
  );
  if (r.status !== 0) {
    console.error(r.stdout || r.stderr);
    console.warn("! Could not set Edge secret via CLI — set manually in Dashboard");
    return;
  }
  console.log("✓ Edge RESEND_FROM updated");
}

const domain = await ensureDomain();
const records = printRecords(domain);

if (APPLY_DNS) {
  console.log("Writing DNS via GoDaddy…");
  await applyGoDaddy(records);
} else {
  console.log("APPLY_DNS not set — add the records above in GoDaddy DNS, then re-run with APPLY_DNS=1 WAIT_VERIFY=1");
}

let verified = domain.status === "verified";
if (WAIT_VERIFY && !verified) {
  verified = await waitVerified(domain.id);
}

if (!SKIP_SUPABASE) {
  if (!verified) {
    console.warn("! Skipping Supabase SMTP/secret until domain is verified (or set SKIP_SUPABASE=0 after verify)");
  } else {
    await configureSupabaseAuth();
    setEdgeSecret();
  }
}

console.log(`\nDone. Canonical From: ${RESEND_FROM}`);
console.log("Outbound surfaces: Auth mail, weekly-digest, waitlist-join, waitlist-notify.");
