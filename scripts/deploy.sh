#!/usr/bin/env bash
# VYBZ — one-command deploy from a local machine.
#
# Applies pending Supabase migrations, deploys Edge Functions, builds the web
# app, deploys to Vercel, and aliases the canonical domain.
#
# USAGE (from repo root):
#   export SUPABASE_ACCESS_TOKEN="sbp_..."   # https://supabase.com/dashboard/account/tokens
#   export VERCEL_TOKEN="..."              # https://vercel.com/account/tokens
#   bash scripts/deploy.sh
#
# Optional overrides:
#   SUPABASE_PROJECT_REF=xixmneooyufbeftdfpcm
#   VERCEL_PROJECT_NAME=vyb-audio
#   VERCEL_PROD_DOMAIN=vybz.astramatrix.xyz
#   NO_SUPABASE=1          # web-only deploy (skip migrations + functions)
#
# Requires: node 20+, npm. Supabase CLI via npx (no global install needed).

set -euo pipefail

say() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()  { printf "\033[1;32m  ✓ %s\033[0m\n" "$*"; }
warn(){ printf "\033[1;33m  ! %s\033[0m\n" "$*"; }
die() { printf "\n\033[1;31m✗ %s\033[0m\n" "$*"; exit 1; }

require() {
  local var="$1"
  if [ -z "${!var:-}" ]; then die "Missing required env var: $var"; fi
}

say "Preflight checks"
require SUPABASE_ACCESS_TOKEN
require VERCEL_TOKEN
: "${SUPABASE_PROJECT_REF:=xixmneooyufbeftdfpcm}"
: "${VERCEL_PROJECT_NAME:=vyb-audio}"
: "${VERCEL_PROD_DOMAIN:=vybz.cloud}"

command -v node >/dev/null || die "node not installed"
command -v npm  >/dev/null || die "npm not installed"
command -v npx  >/dev/null || die "npx not installed"
ok "tools present"

# ── Supabase ───────────────────────────────────────────────────────────────
if [ -z "${NO_SUPABASE:-}" ]; then
  say "Linking Supabase project ($SUPABASE_PROJECT_REF)"
  npx supabase link --project-ref "$SUPABASE_PROJECT_REF" >/dev/null
  ok "linked"

  say "Applying pending migrations"
  npx supabase db push --linked
  ok "migrations applied"

  say "Deploying Edge Functions"
  # Functions that do their own auth / handle CORS preflight / are webhooks —
  # they must NOT sit behind the edge JWT gate (it would 401 preflight + anon calls).
  NO_JWT="passkey bunny-upload bunny-sign watermark watermark-detect push-send stripe-webhook"
  for fn in supabase/functions/*/; do
    name="$(basename "$fn")"
    [ "$name" = "_shared" ] && continue
    printf "    deploying %s ... " "$name"
    extra=""
    echo " $NO_JWT " | grep -q " $name " && extra="--no-verify-jwt"
    if npx supabase functions deploy "$name" $extra >/dev/null 2>&1; then
      printf "\033[32mok\033[0m\n"
    else
      printf "\033[33mfail (check logs)\033[0m\n"
    fi
  done

  SECRETS_TO_SET=""
  for v in OPENAI_API_KEY RESEND_API_KEY RESEND_FROM LIVEKIT_URL LIVEKIT_API_KEY LIVEKIT_API_SECRET VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_SUBJECT PUSH_SEND_SECRET MOD_SECRET STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET; do
    if [ -n "${!v:-}" ]; then SECRETS_TO_SET="$SECRETS_TO_SET $v=${!v}"; fi
  done
  if [ -n "$SECRETS_TO_SET" ]; then
    say "Setting Edge Function secrets"
    # shellcheck disable=SC2086
    npx supabase secrets set $SECRETS_TO_SET >/dev/null
    ok "secrets set"
  else
    warn "Skipping Edge Function secrets (set OPENAI_API_KEY, RESEND_API_KEY, etc. to seed)"
  fi

  if [ -n "${SMTP_PASS:-}" ]; then
    say "Configuring VYBZ auth emails (Resend + redirect URLs)"
    export SUPABASE_PROJECT_REF APP_URL="${APP_URL:-https://$VERCEL_PROD_DOMAIN}"
    export SMTP_HOST="${SMTP_HOST:-smtp.resend.com}" SMTP_PORT="${SMTP_PORT:-465}"
    export SMTP_USER="${SMTP_USER:-resend}" SMTP_SENDER_EMAIL="${SMTP_SENDER_EMAIL:-noreply@astramatrix.xyz}"
    export SMTP_SENDER_NAME="${SMTP_SENDER_NAME:-VYBZ}"
    node supabase/configure-email.mjs
    ok "auth emails configured"
  fi
fi

# ── Build ──────────────────────────────────────────────────────────────────
say "Installing dependencies"
npm install --silent
ok "dependencies installed"

say "Building production bundle"
npm run build
ok "build complete (dist/)"

# ── Vercel ─────────────────────────────────────────────────────────────────
say "Linking Vercel project ($VERCEL_PROJECT_NAME)"
npx vercel link --yes --project "$VERCEL_PROJECT_NAME" --token "$VERCEL_TOKEN"
ok "linked"

say "Deploying to production"
DEPLOY_URL="$(npx vercel deploy --prod --yes --token "$VERCEL_TOKEN" 2>&1 \
  | grep -oE 'https://[a-z0-9-]+\.vercel\.app' | tail -1)"
[ -n "$DEPLOY_URL" ] || die "Could not parse deployment URL from vercel output"
ok "deployed: $DEPLOY_URL"

say "Aliasing canonical domain"
for d in "$VERCEL_PROD_DOMAIN"; do
  printf "    %s ... " "$d"
  if npx vercel alias set "$DEPLOY_URL" "$d" --token "$VERCEL_TOKEN" >/dev/null 2>&1; then
    printf "\033[32mok\033[0m\n"
  else
    printf "\033[33mskipped (assign domain in Vercel dashboard first)\033[0m\n"
  fi
done

say "Smoke check"
for url in "https://$VERCEL_PROD_DOMAIN/" "https://vyb-audio.vercel.app/" "$DEPLOY_URL/"; do
  code="$(curl -sI -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")"
  printf "    HTTP %s  %s\n" "$code" "$url"
done

printf "\n\033[1;32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m\n"
printf "\033[1;32m  VYBZ deployed.\033[0m\n"
printf "  Production: https://%s\n" "$VERCEL_PROD_DOMAIN"
printf "  Fallback:   https://vyb-audio.vercel.app\n"
printf "  Build URL:  %s\n" "$DEPLOY_URL"
printf "\033[1;32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m\n\n"
