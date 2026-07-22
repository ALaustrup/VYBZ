#Requires -Version 5.1
<#
.SYNOPSIS
  VYBZ Phase 0 infrastructure orchestration (Supabase, Vercel, Resend, Git sanity).

.DESCRIPTION
  Run from the repo root. Idempotent where possible. Secrets are read from the
  environment - never committed.

  Example (full run):
    $env:SUPABASE_ACCESS_TOKEN = "sbp_..."
    $env:SMTP_PASS = "re_..."   # Resend API key
    .\scripts\setup-vybz-infra.ps1

  Example (local dev only - no secrets):
    .\scripts\setup-vybz-infra.ps1 -LocalOnly
#>
param(
  [switch]$LocalOnly,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RepoRoot

$VYBZ = @{
  SupabaseRef     = "xixmneooyufbeftdfpcm"
  SupabaseUrl     = "https://xixmneooyufbeftdfpcm.supabase.co"
  VercelProject   = "vybz"
  VercelTeam      = "astramatrix"
  ProdDomain      = "vybz.cloud"
  PreviewDomain   = "vybz-astramatrix.vercel.app"
  MyvybSupabase   = "xhgmpodfpcxfshaqspgh"  # do NOT point VYBZ at this
}

function Say($msg) { Write-Host ""; Write-Host "> $msg" -ForegroundColor Cyan }
function Ok($msg)  { Write-Host "  OK: $msg" -ForegroundColor Green }
function Warn($msg){ Write-Host "  WARN: $msg" -ForegroundColor Yellow }
function Die($msg)  { Write-Host ""; Write-Host "FAIL: $msg" -ForegroundColor Red; exit 1 }

Say "VYBZ infrastructure setup"
Write-Host "  Repo:     $RepoRoot"
Write-Host "  Supabase: $($VYBZ.SupabaseRef)"
Write-Host "  Domain:   $($VYBZ.ProdDomain)"

# ── Git / GitHub ─────────────────────────────────────────────────────────────
Say "Git remotes"
$remotes = (git remote -v 2>$null) -join "`n"
if ($remotes -notmatch "(?i)origin.*(VYBZ|vyb-audio)") { Die "origin must point to ALaustrup/VYBZ (formerly vyb-audio)" }
if ($remotes -notmatch "(?i)upstream.*myvybsocial") { Warn "upstream -> myvybsocial missing (add for cherry-picks): git remote add upstream https://github.com/ALaustrup/myvybsocial.git" }
else { Ok "origin + upstream remotes configured" }

$branch = git branch --show-current
if ($branch -ne "main") { Warn "Not on main (currently: $branch)" } else { Ok "on main" }

if (git status --porcelain) { Warn "Working tree has uncommitted changes" } else { Ok "working tree clean" }

Say "GitHub repo"
try {
  $ghJson = gh repo view ALaustrup/VYBZ --json isPrivate,url 2>$null | ConvertFrom-Json
  if ($ghJson) {
    Ok "$($ghJson.url) (private=$($ghJson.isPrivate))"
    Warn "Branch protection on private repos requires GitHub Pro - enforce manually or upgrade"
  }
} catch {
  Warn "gh CLI unavailable - skip GitHub checks"
}

# ── Vercel ───────────────────────────────────────────────────────────────────
Say "Vercel project link"
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) { Die "vercel CLI not found (npm i -g vercel)" }
vercel link --yes --project $VYBZ.VercelProject 2>&1 | Out-Null
Ok "linked to $($VYBZ.VercelTeam)/$($VYBZ.VercelProject)"

Say "Pull development env to .env.local"
vercel env pull .env.local --yes 2>&1 | Out-Null
Ok ".env.local updated (git-ignored)"

Say "Vercel environment variables"
$envList = vercel env ls 2>&1 | Out-String
foreach ($v in @("VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY")) {
  if ($envList -match $v) { Ok "$v set on Vercel" }
  else { Warn "$v missing - add via: vercel env add $v" }
}
if ($envList -notmatch "Preview") { Warn "Preview environment vars missing - add for PR deploys" }

Say "Production domain"
try {
  $dns = Resolve-DnsName $VYBZ.ProdDomain -ErrorAction Stop
  Ok "$($VYBZ.ProdDomain) resolves"
} catch {
  Warn "$($VYBZ.ProdDomain) has no DNS record yet - ensure registrar NS = ns1/ns2.vercel-dns.com and Vercel DNS zone is enabled (zone:true), then assign domain to project vybz"
  Warn "If domain is on another Vercel project: Dashboard -> Domains -> remove from old project -> add to vybz"
}

# ── Supabase (requires token) ─────────────────────────────────────────────────
if (-not $LocalOnly) {
  if (-not $env:SUPABASE_ACCESS_TOKEN) {
    Warn "SUPABASE_ACCESS_TOKEN not set - skipping Supabase CLI + email config"
    Warn "Get token: https://supabase.com/dashboard/account/tokens"
  } else {
    Say "Supabase link + migrations"
    npx supabase link --project-ref $VYBZ.SupabaseRef 2>&1 | Out-Null
    npx supabase db push --linked 2>&1
    Ok "migrations synced"

    Say "Deploy Edge Functions"
    $noJwt = @("email-code", "passkey", "push-send", "room-mod", "stripe-webhook", "name-drop-notify")
    Get-ChildItem supabase/functions -Directory | ForEach-Object {
      $name = $_.Name
      if ($name -eq "_shared") { return }
      $extra = if ($noJwt -contains $name) { "--no-verify-jwt" } else { "" }
      Write-Host "    deploying $name ..."
      npx supabase functions deploy $name $extra 2>&1
    }
    Ok "edge functions deployed"

    if ($env:SMTP_PASS) {
      Say "Resend + VYBZ auth emails"
      $env:SUPABASE_PROJECT_REF = $VYBZ.SupabaseRef
      $env:APP_URL = "https://$($VYBZ.ProdDomain)"
      $env:PREVIEW_URL = "https://$($VYBZ.PreviewDomain)"
      $env:SMTP_HOST = if ($env:SMTP_HOST) { $env:SMTP_HOST } else { "smtp.resend.com" }
      $env:SMTP_PORT = if ($env:SMTP_PORT) { $env:SMTP_PORT } else { "465" }
      $env:SMTP_USER = if ($env:SMTP_USER) { $env:SMTP_USER } else { "resend" }
      $env:SMTP_SENDER_EMAIL = if ($env:SMTP_SENDER_EMAIL) { $env:SMTP_SENDER_EMAIL } else { "noreply@astramatrix.xyz" }
      $env:SMTP_SENDER_NAME = if ($env:SMTP_SENDER_NAME) { $env:SMTP_SENDER_NAME } else { "VYBZ" }
      node supabase/configure-email.mjs
      Ok "auth redirect URLs + email templates configured for VYBZ"
    } else {
      Warn "SMTP_PASS (Resend API key) not set - skip email config"
      Warn "Set SMTP_PASS env var, then re-run this script"
    }

    if ($env:OPENAI_API_KEY) {
      npx supabase secrets set "OPENAI_API_KEY=$($env:OPENAI_API_KEY)" 2>&1 | Out-Null
      Ok "OPENAI_API_KEY secret set"
    } else {
      Warn "OPENAI_API_KEY not set - embed/moderation/companion functions need it"
    }
  }
}

# ── Build smoke test ───────────────────────────────────────────────────────────
if (-not $SkipBuild) {
  Say "Production build"
  npm run build 2>&1
  Ok "npm run build passed"
}

Write-Host ""
Write-Host "  VYBZ Phase 0 infrastructure check complete." -ForegroundColor Green
Write-Host "  Dev:        npm run dev"
Write-Host "  Preview:    https://$($VYBZ.PreviewDomain)"
Write-Host "  Production: https://$($VYBZ.ProdDomain) (after DNS + domain assign)"
Write-Host "  Supabase:   https://supabase.com/dashboard/project/$($VYBZ.SupabaseRef)"
Write-Host ""
