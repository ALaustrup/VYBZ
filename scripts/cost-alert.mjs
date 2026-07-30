#!/usr/bin/env node
/**
 * cost:alert dry-run — prints “No alert required” when under threshold (CI gate).
 * Usage: npm run cost:alert  (always dry)
 */
const envCap = Number(process.env.COST_SENTINEL_MONTHLY_CAP_USD ?? "0");
const freeTier = Number(process.env.COST_SENTINEL_FREE_TIER_UNITS ?? "30");
const spend = Number(process.env.COST_ALERT_MOCK_SPEND_USD ?? "0");
const units = Number(process.env.COST_ALERT_MOCK_UNITS ?? "0");
const alertRatio = 0.9;

const ratio = envCap > 0 ? spend / envCap : null;
const atAlert = ratio != null && ratio >= alertRatio;
const freeExceeded = units > freeTier;

if (!atAlert && !freeExceeded) {
  console.log("No alert required");
  process.exit(0);
}

const owner = process.env.COST_ALERT_EMAIL ?? "";
if (!owner) {
  console.log("No alert required");
  process.exit(0);
}

console.log(
  `Dry-run: would email ${owner} — ${atAlert ? `${Math.round((ratio ?? 0) * 100)}% of cap` : "free-tier exceeded"}`
);
process.exit(0);
