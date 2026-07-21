#!/usr/bin/env bash
# VYBZ — provision go-live secrets/flags (music-first trajectory).
#
# Phases (order: TURN → Spotify → Tips):
#   PHASE=turn     Open Relay TURN for DM live + Swarm (no Spotify/Tips required)
#   PHASE=oauth    Spotify OAuth + TURN + VITE_FEATURE_OAUTH_SPOTIFY=on
#   PHASE=tips     VITE_FEATURE_TIPS=on (requires Stripe Connect already enabled)
#   PHASE=all      oauth + tips (default)
#
# Prerequisites:
#   export SUPABASE_ACCESS_TOKEN=sbp_...   # https://supabase.com/dashboard/account/tokens
#   npx vercel link  (already done for this repo)
#
# Usage:
#   PHASE=turn bash scripts/provision-oauth-turn-tips.sh
#   export SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=...
#   PHASE=oauth bash scripts/provision-oauth-turn-tips.sh
#   PHASE=tips bash scripts/provision-oauth-turn-tips.sh   # after Stripe Connect on
#
# Spotify dashboard (required for oauth/all):
#   1. https://developer.spotify.com/dashboard → Create app
#   2. Redirect URI: https://xixmneooyufbeftdfpcm.supabase.co/functions/v1/oauth-callback
#   3. Copy Client ID + Secret into the env exports above
#
# Stripe Connect (tips go-live):
#   1. https://dashboard.stripe.com/settings/connect → enable Connect (Express)
#   2. Confirm STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET already on Edge
#   3. PHASE=tips (or all) sets VITE_FEATURE_TIPS=on

set -euo pipefail

REF="${SUPABASE_PROJECT_REF:-xixmneooyufbeftdfpcm}"
APP_URL="${APP_URL:-https://vybz.cloud}"
PHASE="${PHASE:-all}"

die() { printf "\n\033[1;31m✗ %s\033[0m\n" "$*"; exit 1; }
say() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()  { printf "\033[1;32m  ✓ %s\033[0m\n" "$*"; }

require() { [ -n "${!1:-}" ] || die "Missing env: $1"; }

require SUPABASE_ACCESS_TOKEN

: "${TURN_URLS:=turn:openrelay.metered.ca:80,turn:openrelay.metered.ca:443,turn:openrelay.metered.ca:443?transport=tcp}"
: "${TURN_USERNAME:=openrelayproject}"
: "${TURN_CREDENTIAL:=openrelayproject}"
: "${STRIPE_TIP_FEE_BPS:=0}"

add_vite() {
  local name="$1" val="$2" env="$3"
  printf '%s' "$val" | npx vercel env add "$name" "$env" --force >/dev/null 2>&1 \
    || printf '%s' "$val" | npx vercel env add "$name" "$env" >/dev/null 2>&1 \
    || true
}

case "$PHASE" in
  turn)
    say "Setting TURN + APP_URL (DM live + Swarm ICE)"
    npx supabase secrets set \
      --project-ref "$REF" \
      "TURN_URLS=$TURN_URLS" \
      "TURN_USERNAME=$TURN_USERNAME" \
      "TURN_CREDENTIAL=$TURN_CREDENTIAL" \
      "APP_URL=$APP_URL"
    ok "TURN secrets set (Open Relay default — replace with coturn on 51.210.209.112 when SSH works)"
    ;;
  oauth|all)
    require SPOTIFY_CLIENT_ID
    require SPOTIFY_CLIENT_SECRET
    : "${OAUTH_STATE_SECRET:=$SPOTIFY_CLIENT_SECRET}"

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

    say "Setting Vercel OAuth flag"
    for env in production preview; do
      add_vite VITE_FEATURE_OAUTH_SPOTIFY on "$env"
    done
    ok "VITE_FEATURE_OAUTH_SPOTIFY=on"

    if [ "$PHASE" = "all" ]; then
      say "Setting Vercel tips flag"
      for env in production preview; do
        add_vite VITE_FEATURE_TIPS on "$env"
      done
      ok "VITE_FEATURE_TIPS=on"
    fi

    say "Redeploy production so client flags bake in"
    npx vercel --prod --yes >/dev/null
    ok "production redeployed"
    ;;
  tips)
    say "Setting Vercel tips flag (Stripe Connect must already be enabled)"
    for env in production preview; do
      add_vite VITE_FEATURE_TIPS on "$env"
    done
    ok "VITE_FEATURE_TIPS=on"
    say "Redeploy production so client flags bake in"
    npx vercel --prod --yes >/dev/null
    ok "production redeployed"
    ;;
  *)
    die "Unknown PHASE=$PHASE (use turn|oauth|tips|all)"
    ;;
esac

printf "\n\033[1;32mDone (PHASE=%s).\033[0m\n" "$PHASE"
echo "  • Spotify redirect: https://${REF}.supabase.co/functions/v1/oauth-callback"
echo "  • Open Relay TURN is shared/free — replace with coturn on 51.210.209.112 when SSH is available"
echo "  • Confirm Stripe Connect before creators run PayoutSetup"
echo "  • Smoke: Spotify widget · DM jam behind NAT · Tip a musician"
echo "  • UI: Studio Glass + music-first copy — tips/swarm/live surfaces already aligned"
