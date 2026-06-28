#!/usr/bin/env bash
# MYVYB — one-command deploy from a local machine.
#
# Use this when the Cursor cloud agent can't reach Vercel/Supabase secrets.
# It performs the full production deploy: applies pending Supabase migrations,
# deploys all Edge Functions, builds the web app, deploys to Vercel, and aliases
# the canonical domains.
#
# USAGE (from your laptop, in any directory):
#   git clone https://github.com/ALaustrup/vyb && cd vyb/apps/veiled
#   git checkout cursor/fresh-reset-media-overhaul-8c67   # or main, after merge
#   export SUPABASE_ACCESS_TOKEN="sbp_..."   # from https://supabase.com/dashboard/account/tokens
#   export VERCEL_TOKEN="..."                 # from https://vercel.com/account/tokens
#   export SUPABASE_PROJECT_REF="xhgmpodfpcxfshaqspgh"   # the MYVYB Supabase project
#   export VERCEL_PROJECT_NAME="myvybsocial"  # or myvybapp — whatever you picked
#   bash scripts/deploy.sh
#
# Requires: node 22+, supabase CLI (`brew install supabase/tap/supabase`), npm.
# Optional: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, VAPID_PUBLIC_KEY,
#           VAPID_PRIVATE_KEY (only needed the FIRST time, to seed Edge Function
#           secrets — subsequent runs skip if not set).

set -euo pipefail

# ── Helpers ────────────────────────────────────────────────────────────────
say() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()  { printf "\033[1;32m  ✓ %s\033[0m\n" "$*"; }
warn(){ printf "\033[1;33m  ! %s\033[0m\n" "$*"; }
die() { printf "\n\033[1;31m✗ %s\033[0m\n" "$*"; exit 1; }

require() {
  local var="$1"
  if [ -z "${!var:-}" ]; then die "Missing required env var: $var"; fi
}

# ── Preflight ──────────────────────────────────────────────────────────────
say "Preflight checks"
require SUPABASE_ACCESS_TOKEN
require VERCEL_TOKEN
require SUPABASE_PROJECT_REF
: "${VERCEL_PROJECT_NAME:=myvybsocial}"
: "${VERCEL_PROD_DOMAIN:=myvyb.astramatrix.com}"

command -v node >/dev/null      || die "node not installed"
command -v npm  >/dev/null      || die "npm not installed"
command -v npx  >/dev/null      || die "npx not installed"
if ! command -v supabase >/dev/null; then
  warn "supabase CLI not found — install via \`brew install supabase/tap/supabase\` (or skip with NO_SUPABASE=1 to deploy web only)"
  if [ -z "${NO_SUPABASE:-}" ]; then exit 1; fi
fi
ok "tools present"

# ── Supabase ───────────────────────────────────────────────────────────────
if [ -z "${NO_SUPABASE:-}" ]; then
  say "Linking Supabase project ($SUPABASE_PROJECT_REF)"
  supabase link --project-ref "$SUPABASE_PROJECT_REF" >/dev/null
  ok "linked"

  say "Applying pending migrations (supabase/migrations/*)"
  supabase db push --linked
  ok "migrations applied"

  say "Deploying Edge Functions"
  for fn in supabase/functions/*/; do
    name="$(basename "$fn")"
    [ "$name" = "_shared" ] && continue
    printf "    deploying %s ... " "$name"
    supabase functions deploy "$name" --no-verify-jwt >/dev/null 2>&1 \
      && printf "\033[32mok\033[0m\n" || printf "\033[33mskip (already deployed or invalid)\033[0m\n"
  done

  # Seed function secrets ONLY if the env vars are present this run.
  SECRETS_TO_SET=""
  for v in LIVEKIT_URL LIVEKIT_API_KEY LIVEKIT_API_SECRET VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_SUBJECT PUSH_SEND_SECRET; do
    if [ -n "${!v:-}" ]; then SECRETS_TO_SET="$SECRETS_TO_SET $v=${!v}"; fi
  done
  if [ -n "$SECRETS_TO_SET" ]; then
    say "Setting Edge Function secrets"
    # shellcheck disable=SC2086
    supabase secrets set $SECRETS_TO_SET >/dev/null
    ok "secrets set"
  else
    warn "Skipping Edge Function secrets (no LIVEKIT_* / VAPID_* env vars set this run)"
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
# `vercel link --yes` creates the project if it doesn't exist (asks for nothing).
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
    printf "\033[33mskipped (domain may already point elsewhere)\033[0m\n"
  fi
done

# ── Smoke ──────────────────────────────────────────────────────────────────
say "Smoke check"
for url in "https://$VERCEL_PROD_DOMAIN/" "$DEPLOY_URL/"; do
  code="$(curl -sI -o /dev/null -w "%{http_code}" "$url")"
  printf "    HTTP %s  %s\n" "$code" "$url"
done

printf "\n\033[1;32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m\n"
printf "\033[1;32m  MYVYB is live.\033[0m\n"
printf "  Production: https://%s\n" "$VERCEL_PROD_DOMAIN"
printf "  Build URL:  %s\n" "$DEPLOY_URL"
printf "\033[1;32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m\n\n"
