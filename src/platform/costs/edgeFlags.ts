/**
 * Edge / client kill-switch flags — Bridge obeys feature:X:disabled.
 */

import { featureDisabledFlag } from "./budget";

export type EdgeFlagRecord = {
  flag_name: string;
  enabled: boolean;
  reason?: string | null;
};

let cache = new Map<string, EdgeFlagRecord>();
const listeners = new Set<() => void>();

export function resetEdgeFlagCache(): void {
  cache = new Map();
}

export function hydrateEdgeFlags(rows: EdgeFlagRecord[]): void {
  cache = new Map(rows.map((r) => [r.flag_name, r]));
  for (const l of listeners) l();
}

export function setLocalEdgeFlag(flag: EdgeFlagRecord): void {
  cache.set(flag.flag_name, flag);
  for (const l of listeners) l();
}

export function subscribeEdgeFlags(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isFeatureKillSwitched(feature: string): boolean {
  const name = featureDisabledFlag(feature);
  const row = cache.get(name);
  return !!(row && row.enabled);
}

export function listCachedEdgeFlags(): EdgeFlagRecord[] {
  return [...cache.values()];
}

/**
 * Apply kill-switch after budget exceed. Returns the flag name that must exist.
 * Callers persist via set_edge_flag / cost_sentinel_apply_kill_switch RPC or memory.
 */
export function applyKillSwitchLocal(feature: string, reason = "monthly_cap_exceeded"): EdgeFlagRecord {
  const flag: EdgeFlagRecord = {
    flag_name: featureDisabledFlag(feature),
    enabled: true,
    reason,
  };
  setLocalEdgeFlag(flag);
  return flag;
}

/** CI / unit: assert kill-switch present when free-tier exceeded. */
export function assertKillSwitchWhenFreeTierExceeded(opts: {
  freeTierExceeded: boolean;
  feature: string;
  flags: EdgeFlagRecord[];
}): { ok: boolean; missingFlag?: string } {
  if (!opts.freeTierExceeded) return { ok: true };
  const name = featureDisabledFlag(opts.feature);
  const hit = opts.flags.some((f) => f.flag_name === name && f.enabled);
  return hit ? { ok: true } : { ok: false, missingFlag: name };
}
