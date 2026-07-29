import {
  applyCreditUpdate,
  type ReleaseCredit,
  type UpdateCreditInput,
} from "@vybz/domain/credits";
import type { CreditsRepository } from "./types";

export type CreditsSupabaseClient = { from: (table: string) => any };

function mapRow(row: Record<string, unknown>): ReleaseCredit {
  return {
    id: String(row.id),
    releaseId: String(row.release_id),
    ownerId: String(row.owner_id),
    displayName: String(row.display_name),
    role: row.role as ReleaseCredit["role"],
    splitBps: (row.split_bps as number | null) ?? null,
    status: row.status as ReleaseCredit["status"],
    source: row.source as ReleaseCredit["source"],
    sortOrder: Number(row.sort_order ?? 0),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function createSupabaseCreditsRepository(client: CreditsSupabaseClient): CreditsRepository {
  return {
    async listByRelease(ownerId, releaseId) {
      const { data, error } = await client
        .from("release_credits")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("release_id", releaseId)
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return ((data as Record<string, unknown>[]) ?? []).map(mapRow);
    },

    async upsert(credit) {
      const { data, error } = await client
        .from("release_credits")
        .upsert({
          id: credit.id,
          release_id: credit.releaseId,
          owner_id: credit.ownerId,
          display_name: credit.displayName,
          role: credit.role,
          split_bps: credit.splitBps,
          status: credit.status,
          source: credit.source,
          sort_order: credit.sortOrder,
          metadata: credit.metadata,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return mapRow(data as Record<string, unknown>);
    },

    async update(ownerId, creditId, patch: UpdateCreditInput) {
      const { data: existing, error: gErr } = await client
        .from("release_credits")
        .select("*")
        .eq("id", creditId)
        .eq("owner_id", ownerId)
        .maybeSingle();
      if (gErr) throw new Error(gErr.message);
      if (!existing) throw new Error("Credit not found");
      const next = applyCreditUpdate(mapRow(existing as Record<string, unknown>), patch);
      const { data, error } = await client
        .from("release_credits")
        .update({
          display_name: next.displayName,
          role: next.role,
          split_bps: next.splitBps,
          status: next.status,
          sort_order: next.sortOrder,
          metadata: next.metadata,
        })
        .eq("id", creditId)
        .eq("owner_id", ownerId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return mapRow(data as Record<string, unknown>);
    },

    async remove(ownerId, creditId) {
      const { error } = await client
        .from("release_credits")
        .delete()
        .eq("id", creditId)
        .eq("owner_id", ownerId);
      if (error) throw new Error(error.message);
    },

    async replaceForRelease(ownerId, releaseId, credits) {
      const { error: delErr } = await client
        .from("release_credits")
        .delete()
        .eq("owner_id", ownerId)
        .eq("release_id", releaseId);
      if (delErr) throw new Error(delErr.message);
      if (credits.length === 0) return [];
      const rows = credits.map((c) => ({
        id: c.id,
        release_id: releaseId,
        owner_id: ownerId,
        display_name: c.displayName,
        role: c.role,
        split_bps: c.splitBps,
        status: c.status,
        source: c.source,
        sort_order: c.sortOrder,
        metadata: c.metadata,
      }));
      const { data, error } = await client.from("release_credits").insert(rows).select("*");
      if (error) throw new Error(error.message);
      return ((data as Record<string, unknown>[]) ?? []).map(mapRow);
    },
  };
}
