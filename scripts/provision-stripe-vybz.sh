#!/usr/bin/env bash
# VYBZ — point Edge Functions at the VYBZ Stripe business account.
#
# Prerequisites:
#   1. Open https://dashboard.stripe.com/acct_1TwTEtAnnpt9OYZI/apikeys (or switch to VYBZ in the account picker)
#   2. Reveal Secret key (sk_test_… for Test, sk_live_… for Live)
#   3. Create webhook (see below) and copy Signing secret (whsec_…)
#   4. export SUPABASE_ACCESS_TOKEN=sbp_...  # https://supabase.com/dashboard/account/tokens
#
# Webhook (VYBZ Dashboard → Developers → Webhooks → Add endpoint):
#   URL:  https://xixmneooyufbeftdfpcm.supabase.co/functions/v1/stripe-webhook
#   Events on YOUR ACCOUNT:  checkout.session.completed
#   Also create a Connect destination (or enable "Listen to events on Connected accounts")
#     for: account.updated
#
# Connect branding (required for Express onboarding UX):
#   https://dashboard.stripe.com/settings/connect
#   Privacy: https://vybz.cloud/legal/privacy
#   Terms:   https://vybz.cloud/legal/terms
#   Express branding: https://dashboard.stripe.com/settings/connect/express-dashboard/branding
#
# Usage:
#   export STRIPE_SECRET_KEY=sk_test_...
#   export STRIPE_WEBHOOK_SECRET=whsec_...
#   bash scripts/provision-stripe-vybz.sh

set -euo pipefail

REF="${SUPABASE_PROJECT_REF:-xixmneooyufbeftdfpcm}"

die() { printf "\n\033[1;31m✗ %s\033[0m\n" "$*"; exit 1; }
say() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()  { printf "\033[1;32m  ✓ %s\033[0m\n" "$*"; }

require() { [ -n "${!1:-}" ] || die "Missing env: $1"; }

require SUPABASE_ACCESS_TOKEN
require STRIPE_SECRET_KEY
require STRIPE_WEBHOOK_SECRET

case "$STRIPE_SECRET_KEY" in
  sk_test_*|sk_live_*|rk_test_*|rk_live_*) ;;
  *) die "STRIPE_SECRET_KEY must start with sk_ or rk_" ;;
esac
case "$STRIPE_WEBHOOK_SECRET" in
  whsec_*) ;;
  *) die "STRIPE_WEBHOOK_SECRET must start with whsec_" ;;
esac

: "${STRIPE_TIP_FEE_BPS:=0}"
: "${APP_URL:=https://vybz.cloud}"

say "Setting Supabase Edge secrets for VYBZ Stripe (project $REF)"
npx supabase secrets set \
  --project-ref "$REF" \
  "STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY" \
  "STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET" \
  "STRIPE_TIP_FEE_BPS=$STRIPE_TIP_FEE_BPS" \
  "APP_URL=$APP_URL"
ok "STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET + STRIPE_TIP_FEE_BPS + APP_URL"

say "Done. Smoke:"
echo "  1. You → Settings ⋯ → Enable tips (Express onboard on VYBZ)"
echo "  2. Second account → Tip on /u/{you}"
echo "  3. Confirm tips.status=paid after Checkout"
echo "  Connect: https://dashboard.stripe.com/connect"
echo "  Branding: https://dashboard.stripe.com/settings/connect/express-dashboard/branding"
