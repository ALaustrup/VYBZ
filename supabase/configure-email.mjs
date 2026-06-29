#!/usr/bin/env node
/**
 * Configure MYVYB's branded auth emails on Supabase.
 *
 * Supabase only allows custom email templates when a custom SMTP sender is set
 * (or on a paid plan). This script wires both in one shot via the Management API:
 *   1. custom SMTP (so auth mail is sent from your own astramatrix.xyz address), and
 *   2. the branded welcome/confirmation template (supabase/email-templates/confirm.html).
 *
 * It also sets the Site URL + redirect allow-list so confirmation links re-open
 * the app directly.
 *
 * IMPORTANT — root cause of the "demiurge.cloud" bounce: Supabase Auth was set to
 * send from an UNVERIFIED domain, so Resend rejected it (550). The sender domain
 * MUST be verified in Resend first (astramatrix.xyz → Resend → Domains → Verify
 * the SPF + DKIM DNS records). Once verified, run this with the astramatrix.xyz
 * sender below to repoint Auth.
 *
 * Sender: Resend (https://resend.com). After verifying astramatrix.xyz, create an
 * SMTP credential and use host smtp.resend.com, port 465, user "resend",
 * pass = API key.
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_ACCESS_TOKEN="sbp_..."
 *   $env:SUPABASE_PROJECT_REF="xhgmpodfpcxfshaqspgh"
 *   $env:SMTP_HOST="smtp.resend.com"; $env:SMTP_PORT="465"
 *   $env:SMTP_USER="resend"; $env:SMTP_PASS="<resend-api-key>"
 *   $env:SMTP_SENDER_EMAIL="noreply@astramatrix.xyz"; $env:SMTP_SENDER_NAME="MYVYB"
 *   $env:APP_URL="https://myvyb.astramatrix.xyz"
 *   node supabase/configure-email.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const need = (k) => {
  const v = process.env[k];
  if (!v) {
    console.error(`Missing required env var: ${k}`);
    process.exit(1);
  }
  return v;
};

const token = need("SUPABASE_ACCESS_TOKEN");
const ref = need("SUPABASE_PROJECT_REF");
const APP = process.env.APP_URL ?? "https://myvyb.astramatrix.xyz";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, "email-templates", "confirm.html"), "utf8");
const subject = "Welcome to MYVYB — confirm your email";

const body = {
  // Where confirmation links land after verifying.
  site_url: APP,
  uri_allow_list: [APP, `${APP}/**`, "http://localhost:5173", "http://localhost:5173/**"].join(","),
  mailer_secure_email_change_enabled: false,

  // Custom SMTP — required to send branded mail from your own address.
  smtp_host: need("SMTP_HOST"),
  smtp_port: String(need("SMTP_PORT")),
  smtp_user: need("SMTP_USER"),
  smtp_pass: need("SMTP_PASS"),
  smtp_admin_email: need("SMTP_SENDER_EMAIL"),
  smtp_sender_name: process.env.SMTP_SENDER_NAME ?? "MYVYB",

  // Branded templates (welcome + confirm). Magic link reuses the same.
  mailer_subjects_confirmation: subject,
  mailer_templates_confirmation_content: html,
  mailer_subjects_email_change: subject,
  mailer_templates_email_change_content: html,
  mailer_subjects_magic_link: subject,
  mailer_templates_magic_link_content: html,
};

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "veiled-setup/1.0",
  },
  body: JSON.stringify(body),
});

if (!res.ok) {
  console.error(`Failed (${res.status}):`, await res.text());
  process.exit(1);
}
console.log("✅ Branded MYVYB auth emails + SMTP configured.");
