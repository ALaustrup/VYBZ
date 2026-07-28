#!/usr/bin/env node
/**
 * Configure VYBZ branded auth emails on Supabase.
 *
 * Supabase only allows custom email templates when a custom SMTP sender is set
 * (or on a paid plan). This script wires both in one shot via the Management API:
 *   1. custom SMTP (Resend → vybz.cloud), and
 *   2. the branded welcome/confirmation template (supabase/email-templates/confirm.html).
 *
 * It also sets the Site URL + redirect allow-list so confirmation links re-open
 * the app directly at vybz.cloud (or APP_URL override).
 *
 * Sender domain MUST be verified in Resend first (vybz.cloud → SPF + DKIM).
 * Prefer: node scripts/configure-vybz-cloud-email.mjs
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_ACCESS_TOKEN="sbp_..."
 *   $env:SUPABASE_PROJECT_REF="xixmneooyufbeftdfpcm"
 *   $env:SMTP_HOST="smtp.resend.com"; $env:SMTP_PORT="465"
 *   $env:SMTP_USER="resend"; $env:SMTP_PASS="<resend-api-key>"
 *   $env:SMTP_SENDER_EMAIL="noreply@vybz.cloud"; $env:SMTP_SENDER_NAME="VYBZ"
 *   $env:APP_URL="https://vybz.cloud"
 *   node supabase/configure-email.mjs
 *
 * To update templates + URLs only (SMTP already configured), omit SMTP_* vars.
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
const ref = process.env.SUPABASE_PROJECT_REF ?? "xixmneooyufbeftdfpcm";
const APP = process.env.APP_URL ?? "https://vybz.cloud";
const PREVIEW = process.env.PREVIEW_URL ?? "https://vybz-astramatrix.vercel.app";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, "email-templates", "confirm.html"), "utf8");

const body = {
  site_url: APP,
  uri_allow_list: [
    APP,
    `${APP}/**`,
    PREVIEW,
    `${PREVIEW}/**`,
    "http://localhost:5173",
    "http://localhost:5173/**",
  ].join(","),
  mailer_secure_email_change_enabled: false,

  mailer_subjects_confirmation: "Welcome to VYBZ — confirm your email",
  mailer_templates_confirmation_content: html,
  mailer_subjects_email_change: "Confirm your new email — VYBZ",
  mailer_templates_email_change_content: html,
  mailer_subjects_magic_link: "Sign in to VYBZ",
  mailer_templates_magic_link_content: html,
};

if (process.env.SMTP_HOST) {
  body.smtp_host = need("SMTP_HOST");
  body.smtp_port = String(need("SMTP_PORT"));
  body.smtp_user = need("SMTP_USER");
  body.smtp_pass = need("SMTP_PASS");
  body.smtp_admin_email = need("SMTP_SENDER_EMAIL");
  body.smtp_sender_name = process.env.SMTP_SENDER_NAME ?? "VYBZ";
}

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "vybz-setup/1.0",
  },
  body: JSON.stringify(body),
});

if (!res.ok) {
  console.error(`Failed (${res.status}):`, await res.text());
  process.exit(1);
}
console.log(`✅ VYBZ auth emails configured for ${APP} (project ${ref}).`);
