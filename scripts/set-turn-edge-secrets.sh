#!/usr/bin/env bash
# VYBZ — push TURN_* secrets to Supabase Edge (project xixmneooyufbeftdfpcm).
#
# Managed TURN only (no VYBZ VPS). Default shape = ExpressTURN free:
#   TURN_URLS=turn:free.expressturn.com:3478?transport=udp,turn:free.expressturn.com:3478?transport=tcp
#
# Prerequisites:
#   export SUPABASE_ACCESS_TOKEN=sbp_...   # https://supabase.com/dashboard/account/tokens
#   export TURN_URLS=...
#   export TURN_USERNAME=...
#   export TURN_CREDENTIAL=...
#
# Usage:
#   bash scripts/set-turn-edge-secrets.sh

set -euo pipefail

REF="${SUPABASE_PROJECT_REF:-xixmneooyufbeftdfpcm}"
APP_URL="${APP_URL:-https://vybz.cloud}"

die() { printf "\n\033[1;31m✗ %s\033[0m\n" "$*"; exit 1; }
say() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()  { printf "\033[1;32m  ✓ %s\033[0m\n" "$*"; }

require() { [ -n "${!1:-}" ] || die "Missing env: $1"; }

require SUPABASE_ACCESS_TOKEN
require TURN_URLS
require TURN_USERNAME
require TURN_CREDENTIAL

# Refuse known public Open Relay placeholders unless explicitly forced.
if [[ "${TURN_USERNAME}" == "openrelayproject" && "${ALLOW_OPENRELAY:-}" != "1" ]]; then
  die "Refusing Open Relay defaults. Use ExpressTURN (or another managed TURN) credentials, or set ALLOW_OPENRELAY=1."
fi

say "Setting Edge secrets on $REF"
npx supabase secrets set \
  --project-ref "$REF" \
  "TURN_URLS=$TURN_URLS" \
  "TURN_USERNAME=$TURN_USERNAME" \
  "TURN_CREDENTIAL=$TURN_CREDENTIAL" \
  "APP_URL=$APP_URL"
ok "TURN_* + APP_URL set"

printf '\nNext: sign in on %s → Admin → Infra → Refresh (TURN ready).\n' "$APP_URL"
printf 'Smoke: room voice / 1:1 cam from cellular + Wi‑Fi NAT.\n'
