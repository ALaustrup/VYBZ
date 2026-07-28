#!/usr/bin/env bash
# Configure Supabase Auth to send email through Resend (free tier: 3,000/mo).
#
# Why: Supabase's built-in email is throttled to a few messages per hour — fine
# for local dev, but it will silently break sign-up / passkey-recovery / password
# reset the moment real creators arrive. Resend's SMTP relay removes that ceiling
# for free.
#
# Prereqs (one-time, done by you in the Resend + registrar dashboards):
#   1. Create a free account at https://resend.com
#   2. Add & verify a sending domain (recommended: a subdomain you control, e.g.
#      `mail.vybz.cloud` or root `vybz.cloud`). Resend shows the exact DNS
#      records to add (SPF TXT, DKIM CNAME/TXT, and an MX for the send subdomain).
#   3. Create an API key (Full access) → this is your SMTP password.
#
# Then set these and run this script (values are read from env / Cursor secrets):
#   RESEND_API_KEY   = re_...            (the API key from step 3)
#   RESEND_FROM      = noreply@vybz.cloud   (an address on the verified domain)
#   RESEND_FROM_NAME = VYBZ                              (optional; defaults to VYBZ)
#   SUPABASE_ACCESS_TOKEN = sbp_...      (already present in this environment)
#
# Usage:  RESEND_API_KEY=re_xxx RESEND_FROM=noreply@vybz.cloud ./scripts/configure-resend-smtp.sh
#
# Prefer: node scripts/configure-vybz-cloud-email.mjs (creates domain + optional GoDaddy DNS).
# This calls the Supabase Management API to set the project's custom SMTP. It does
# NOT print secrets. Re-runnable (idempotent).

set -euo pipefail

REF="${SUPABASE_PROJECT_REF:-xixmneooyufbeftdfpcm}"
TOK="${SUPABASE_ACCESS_TOKEN:-}"
KEY="${RESEND_API_KEY:-}"
FROM="${RESEND_FROM:-}"
FROM_NAME="${RESEND_FROM_NAME:-VYBZ}"

# Resend SMTP relay (fixed): implicit TLS on 465, or STARTTLS on 587.
SMTP_HOST="smtp.resend.com"
SMTP_PORT="465"
SMTP_USER="resend"

fail() { echo "ERROR: $1" >&2; exit 1; }
[ -n "$TOK" ]  || fail "SUPABASE_ACCESS_TOKEN is not set."
[ -n "$KEY" ]  || fail "RESEND_API_KEY is not set (get it from https://resend.com/api-keys)."
[ -n "$FROM" ] || fail "RESEND_FROM is not set (an address on your Resend-verified domain, e.g. noreply@vybz.cloud)."

echo "Configuring Supabase ($REF) Auth SMTP → Resend as '$FROM' ($FROM_NAME)…"

# Build the JSON body without echoing the secret to logs.
BODY=$(python3 - "$SMTP_HOST" "$SMTP_PORT" "$SMTP_USER" "$KEY" "$FROM" "$FROM_NAME" <<'PY'
import json, sys
host, port, user, key, frm, name = sys.argv[1:7]
print(json.dumps({
    "smtp_admin_email": frm,
    "smtp_host": host,
    "smtp_port": port,
    "smtp_user": user,
    "smtp_pass": key,
    "smtp_sender_name": name,
    # Give Resend headroom; GoTrue caps per-hour sends. 100/h is safe on free tier.
    "rate_limit_email_sent": 100,
}))
PY
)

HTTP=$(curl -s -o /tmp/resend_smtp_resp.json -w "%{http_code}" \
  -X PATCH "https://api.supabase.com/v1/projects/$REF/config/auth" \
  -H "Authorization: Bearer $TOK" \
  -H "Content-Type: application/json" \
  --data "$BODY")

if [ "$HTTP" = "200" ]; then
  echo "✅ SMTP configured. Auth emails (confirmations, magic links, passkey recovery, resets) now route through Resend."
  echo "   Verify with a real sign-up, or from Supabase Dashboard → Authentication → Emails."
else
  echo "❌ Failed (HTTP $HTTP):"
  cat /tmp/resend_smtp_resp.json >&2
  exit 1
fi
