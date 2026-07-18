#!/usr/bin/env bash
# VYBZ — activate parked satellite domains (GoDaddy DNS -> Vercel redirect).
#
# The Vercel project astramatrix/vybz already has each satellite domain added
# with a 308 redirect to https://vybz.cloud. These domains are registered at
# GoDaddy and still resolve to GoDaddy parking IPs, so the only remaining step
# is to repoint their DNS at Vercel. This script does exactly that — and nothing
# else — via the GoDaddy DNS API, then verifies the result.
#
# What it changes, per domain:
#   • apex A record  @  ->  Vercel anycast IP  (replaces GoDaddy parking IPs)
#   • (opt-in) www CNAME  ->  cname.vercel-dns.com   [SET_WWW=1]
#
# The GoDaddy "replace records of a type/name" call (PUT .../records/A/@) is
# idempotent: re-running converges to the same state and clears the parking IPs.
#
# USAGE (from repo root):
#   export GODADDY_API_KEY="..."           # GoDaddy production API key
#   export GODADDY_API_SECRET="..."        # GoDaddy production API secret
#   export VERCEL_TOKEN="..."              # optional: enables Vercel-side verification
#   bash scripts/activate-vybz-domains.sh              # apply
#   DRY_RUN=1 bash scripts/activate-vybz-domains.sh    # preview, no writes
#
# Optional overrides:
#   DOMAINS="vybz.work vybz.space"   # custom subset (default: all five satellites)
#   VERCEL_A_IP=76.76.21.21          # apex target (matches working vybz.cloud)
#   TTL=600                          # DNS TTL in seconds
#   SET_WWW=1                        # also set a www CNAME -> Vercel
#   VERCEL_TEAM=team_gq3IWtz1kK0aO7kzMrrk6N6a   # Astra Matrix (for verification)
#   VERCEL_PROJECT=vybz              # project name (for verification)
#
# Requires: bash, curl, python3 (for JSON). GoDaddy production keys — a test-env
# key returns 401/403 against the production API.

set -euo pipefail

# ── output helpers (match scripts/deploy.sh) ────────────────────────────────
say() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()  { printf "\033[1;32m  ✓ %s\033[0m\n" "$*"; }
warn(){ printf "\033[1;33m  ! %s\033[0m\n" "$*"; }
die() { printf "\n\033[1;31m✗ %s\033[0m\n" "$*" >&2; exit 1; }

require() { local var="$1"; [ -n "${!var:-}" ] || die "Missing required env var: $var"; }

# ── config ──────────────────────────────────────────────────────────────────
: "${GODADDY_API:=https://api.godaddy.com/v1}"
: "${VERCEL_API:=https://api.vercel.com}"
: "${VERCEL_A_IP:=76.76.21.21}"          # proven target: canonical vybz.cloud uses this
: "${VERCEL_CNAME:=cname.vercel-dns.com}"
: "${TTL:=600}"
: "${SET_WWW:=0}"
: "${DRY_RUN:=0}"
: "${VERCEL_TEAM:=team_gq3IWtz1kK0aO7kzMrrk6N6a}"
: "${VERCEL_PROJECT:=vybz}"
: "${DOMAINS:=vybz.work vybz.space vybz.world vybz.guru vybz.cc}"

# GoDaddy parking IPs we expect to be replacing (for reporting only).
PARKING_IPS="15.197.148.33 3.33.130.190"

command -v curl    >/dev/null || die "curl not installed"
command -v python3 >/dev/null || die "python3 not installed"

say "Preflight"
require GODADDY_API_KEY
require GODADDY_API_SECRET
GD_AUTH="Authorization: sso-key ${GODADDY_API_KEY}:${GODADDY_API_SECRET}"
[ "$DRY_RUN" = "1" ] && warn "DRY_RUN=1 — no DNS writes will be performed"
ok "target apex A record: $VERCEL_A_IP (TTL ${TTL}s)"
[ "$SET_WWW" = "1" ] && ok "will also set www CNAME -> $VERCEL_CNAME"
ok "domains: $DOMAINS"

# Fail fast on bad credentials with a single, cheap authenticated call.
# Skipped in DRY_RUN so a preview can run fully offline.
if [ "$DRY_RUN" != "1" ]; then
  probe_status="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 \
    -H "$GD_AUTH" "$GODADDY_API/domains?limit=1" || echo 000)"
  case "$probe_status" in
    200) ok "GoDaddy credentials accepted" ;;
    401|403) die "GoDaddy rejected credentials (HTTP $probe_status). Use PRODUCTION keys from https://developer.godaddy.com/keys" ;;
    000) die "Could not reach GoDaddy API ($GODADDY_API) — check network egress" ;;
    *)   warn "Unexpected GoDaddy probe status HTTP $probe_status — continuing" ;;
  esac
fi

# ── GoDaddy helpers ──────────────────────────────────────────────────────────
# Current data values for a given record type/name, space-separated.
gd_get_records() {
  local domain="$1" type="$2" name="$3"
  curl -s --max-time 25 -H "$GD_AUTH" \
    "$GODADDY_API/domains/$domain/records/$type/$name" \
    | python3 -c "import sys,json;
try:
    rs=json.load(sys.stdin)
except Exception:
    rs=[]
print(' '.join(str(r.get('data','')) for r in rs) if isinstance(rs,list) else '')"
}

# Replace all records of type/name with a single value. Idempotent.
gd_put_record() {
  local domain="$1" type="$2" name="$3" data="$4"
  local body
  body="$(python3 -c "import json,sys; print(json.dumps([{'data': sys.argv[1], 'ttl': int(sys.argv[2])}]))" "$data" "$TTL")"
  if [ "$DRY_RUN" = "1" ]; then
    printf "      [dry-run] PUT %s/records/%s/%s  <-  %s\n" "$domain" "$type" "$name" "$body"
    return 0
  fi
  local code
  code="$(curl -s -o /tmp/gd_put_resp.json -w '%{http_code}' --max-time 25 -X PUT \
    -H "$GD_AUTH" -H "Content-Type: application/json" \
    "$GODADDY_API/domains/$domain/records/$type/$name" -d "$body" || echo 000)"
  if [ "$code" = "200" ]; then
    return 0
  fi
  warn "PUT $type/$name for $domain failed (HTTP $code): $(cat /tmp/gd_put_resp.json 2>/dev/null)"
  return 1
}

# ── Vercel-side verification (optional) ──────────────────────────────────────
vercel_misconfigured() {
  local domain="$1"
  [ -n "${VERCEL_TOKEN:-}" ] || { echo "unknown"; return; }
  curl -s --max-time 20 -H "Authorization: Bearer $VERCEL_TOKEN" \
    "$VERCEL_API/v6/domains/$domain/config?teamId=$VERCEL_TEAM" \
    | python3 -c "import sys,json;
try:
    print(str(json.load(sys.stdin).get('misconfigured')))
except Exception:
    print('unknown')"
}

# ── main ─────────────────────────────────────────────────────────────────────
failures=0
for domain in $DOMAINS; do
  say "Activating $domain"

  before="$(gd_get_records "$domain" A @)"
  printf "    current A @: %s\n" "${before:-<none>}"

  if [ "$before" = "$VERCEL_A_IP" ]; then
    ok "apex A already points at Vercel — no change"
  else
    if gd_put_record "$domain" A @ "$VERCEL_A_IP"; then
      [ "$DRY_RUN" = "1" ] || ok "apex A set -> $VERCEL_A_IP"
    else
      failures=$((failures+1)); continue
    fi
  fi

  if [ "$SET_WWW" = "1" ]; then
    if gd_put_record "$domain" CNAME www "$VERCEL_CNAME"; then
      [ "$DRY_RUN" = "1" ] || ok "www CNAME set -> $VERCEL_CNAME"
    else
      failures=$((failures+1))
    fi
  fi

  # Verify the write landed at GoDaddy (skip in dry-run).
  if [ "$DRY_RUN" != "1" ]; then
    after="$(gd_get_records "$domain" A @)"
    if [ "$after" = "$VERCEL_A_IP" ]; then
      ok "verified GoDaddy A @ = $after"
    else
      warn "post-write A @ is '$after' (expected $VERCEL_A_IP)"
      failures=$((failures+1))
    fi
    mc="$(vercel_misconfigured "$domain")"
    case "$mc" in
      False) ok "Vercel reports domain configured (misconfigured=False)" ;;
      True)  warn "Vercel still misconfigured — DNS may need propagation time" ;;
      *)     : ;; # unknown / no token
    esac
  fi
done

echo
if [ "$DRY_RUN" = "1" ]; then
  warn "DRY_RUN complete — no changes were made. Unset DRY_RUN to apply."
  exit 0
fi
if [ "$failures" -eq 0 ]; then
  printf "\033[1;32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m\n"
  printf "\033[1;32m  All domains repointed to Vercel.\033[0m\n"
  printf "  DNS propagation (GoDaddy TTL) is typically minutes; Vercel then\n"
  printf "  issues TLS automatically. Confirm with:\n"
  printf "    for d in %s; do curl -sI \"https://\$d/\" | grep -iE '^(HTTP|location)'; done\n" "$DOMAINS"
  printf "\033[1;32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m\n"
else
  die "$failures step(s) failed — see warnings above"
fi
