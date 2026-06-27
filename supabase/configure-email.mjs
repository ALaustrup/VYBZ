#!/usr/bin/env node
/**
 * Configure Veiled's branded auth emails on Supabase.
 *
 * Supabase only allows custom email templates when a custom SMTP sender is set
 * (or on a paid plan). This script wires both in one shot via the Management API:
 *   1. custom SMTP (so mail is sent from your own "Veiled" address), and
 *   2. the branded welcome/confirmation template (supabase/email-templates/confirm.html).
 *
 * It also sets the Site URL + redirect allow-list so confirmation links re-open
 * the app directly.
 *
 * Recommended sender: Resend (https://resend.com) — free tier, quick domain
 * verification. After verifying a domain (e.g. getveiled.app), create an SMTP
 * credential and use host smtp.resend.com, port 465, user "resend", pass = API key.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_... \
 *   SUPABASE_PROJECT_REF=xhgmpodfpcxfshaqspgh \
 *   SMTP_HOST=smtp.resend.com SMTP_PORT=465 \
 *   SMTP_USER=resend SMTP_PASS=<api-key> \
 *   SMTP_SENDER_EMAIL="hello@getveiled.app" SMTP_SENDER_NAME="Veiled" \
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
const APP = process.env.APP_URL ?? "https://getveiled.vercel.app";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, "email-templates", "confirm.html"), "utf8");
const subject = "Welcome to Veiled — confirm your email";

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
  smtp_sender_name: process.env.SMTP_SENDER_NAME ?? "Veiled",

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
console.log("✅ Branded Veiled auth emails + SMTP configured.");
