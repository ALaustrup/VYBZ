#!/usr/bin/env bash
# VYBZ — provision Phase 2 (Spotify OAuth + TURN) then Phase 1 (tips flags).
#
# Prerequisites:
#   export SUPABASE_ACCESS_TOKEN=sbp_...   # https://supabase.com/dashboard/account/tokens
#   export VERCEL_TOKEN=...               # https://vercel.com/account/tokens
#   npx vercel link  (already done for this repo)
#
# Usage:
#   export SPOTIFY_CLIENT_ID=...
#   export SPOTIFY_CLIENT_SECRET=...
#   # optional TURN override (defaults to Metered Open Relay for NAT testing):
#   # export TURN_URLS='turn:openrelay.metered.ca:80,turn:openrelay.metered.ca:443'
#   # export TURN_USERNAME=openrelayproject
#   # export TURN_CREDENTIAL=openrelayproject
#   bash scripts/provision-oauth-turn-tips.sh
#
# Spotify dashboard (required once):
#   1. https://developer.spotify.com/dashboard → Create app
#   2. Redirect URI: https://xixmneooyufbeftdfpcm.supabase.co/functions/v1/oauth-callback
#   3. Copy Client ID + Secret into the env exports above
#   4. Also add https://vybz.cloud to any allow-lists if present
#
# Stripe Connect (tips go-live):
#   1. https://dashboard.stripe.com/settings/connect → enable Connect (Express)
#   2. Confirm STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET already on Edge
#   3. This script sets VITE_FEATURE_TIPS=on (Production + Preview)

set -euo pipefail

REF="${SUPABASE_PROJECT_REF:-xixmneooyufbeftdfpcm}"
APP_URL="${APP_URL:-https://vybz.cloud}"

die() { printf "\n\033[1;31m✗ %s\033[0m\n" "$*"; exit 1; }
say() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()  { printf "\033[1;32m  ✓ %s\033[0m\n" "$*"; }

require() { [ -n "${!1:-}" ] || die "Missing env: $1"; }

require SUPABASE_ACCESS_TOKEN
require SPOTIFY_CLIENT_ID
require SPOTIFY_CLIENT_SECRET

: "${TURN_URLS:=turn:openrelay.metered.ca:80,turn:openrelay.metered.ca:443,turn:openrelay.metered.ca:443?transport=tcp}"
: "${TURN_USERNAME:=openrelayproject}"
: "${TURN_CREDENTIAL:=openrelayproject}"
: "${OAUTH_STATE_SECRET:=$SPOTIFY_CLIENT_SECRET}"
: "${STRIPE_TIP_FEE_BPS:=0}"

say "Setting Supabase Edge secrets (OAuth + TURN + APP_URL)"
npx supabase secrets set \
  --project-ref "$REF" \
  "SPOTIFY_CLIENT_ID=$SPOTIFY_CLIENT_ID" \
  "SPOTIFY_CLIENT_SECRET=$SPOTIFY_CLIENT_SECRET" \
  "OAUTH_STATE_SECRET=$OAUTH_STATE_SECRET" \
  "TURN_URLS=$TURN_URLS" \
  "TURN_USERNAME=$TURN_USERNAME" \
  "TURN_CREDENTIAL=$TURN_CREDENTIAL" \
  "APP_URL=$APP_URL" \
  "STRIPE_TIP_FEE_BPS=$STRIPE_TIP_FEE_BPS"
ok "edge secrets set"

say "Setting Vercel Production/Preview feature flags"
# vercel env add is interactive; use stdin pipe for non-interactive
add_vite() {
  local name="$1" val="$2" env="$3"
  printf '%s' "$val" | npx vercel env add "$name" "$env" --force >/dev/null 2>&1 \
    || printf '%s' "$val" | npx vercel env add "$name" "$env" >/dev/null 2>&1 \
    || true
}

for env in production preview; do
  add_vite VITE_FEATURE_OAUTH_SPOTIFY on "$env"
  add_vite VITE_FEATURE_TIPS on "$env"
done
ok "VITE_FEATURE_OAUTH_SPOTIFY=on, VITE_FEATURE_TIPS=on"

say "Redeploy production so client flags bake in"
npx vercel --prod --yes >/dev/null
ok "production redeployed"

printf "\n\033[1;32mDone.\033[0m\n"
echo "  • Spotify redirect must be: https://${REF}.supabase.co/functions/v1/oauth-callback"
echo "  • Open Relay TURN is a shared free relay — replace with coturn on 51.210.209.112 when SSH is available"
echo "  • Confirm Stripe Connect is enabled before creators run PayoutSetup"
echo "  • Smoke: Connect Spotify widget · DM live call behind NAT · Tip a creator"
