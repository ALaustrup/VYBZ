import {
  applyReleaseUpdate,
  buildReleaseProject,
  type CreateReleaseInput,
  type ReleaseAsset,
  type ReleaseBundle,
  type ReleaseFinding,
  type ReleaseProject,
  type ReleaseStatus,
  type UpdateReleaseInput,
} from "@vybz/domain/releases";
import type { ReleasesRepository } from "./types";

/** Minimal Supabase client surface used by this adapter (avoids hard coupling). */
export type ReleasesSupabaseClient = {
  from: (table: string) => any;
};

function mapProject(row: Record<string, unknown>): ReleaseProject {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    title: String(row.title),
    artistName: (row.artist_name as string | null) ?? null,
    status: row.status as ReleaseStatus,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    idempotencyKey: (row.idempotency_key as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    deletedAt: (row.deleted_at as string | null) ?? null,
  };
}

function mapAsset(row: Record<string, unknown>): ReleaseAsset {
  return {
    id: String(row.id),
    releaseId: String(row.release_id),
    ownerId: String(row.owner_id),
    kind: row.kind as ReleaseAsset["kind"],
    fileName: String(row.file_name),
    mimeType: String(row.mime_type),
    sizeBytes: Number(row.size_bytes ?? 0),
    checksum: (row.checksum as string | null) ?? null,
    probe: (row.probe as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
  };
}

function mapFinding(row: Record<string, unknown>): ReleaseFinding {
  return {
    id: String(row.id),
    releaseId: String(row.release_id),
    ownerId: String(row.owner_id),
    assetId: (row.asset_id as string | null) ?? null,
    code: String(row.code),
    severity: row.severity as ReleaseFinding["severity"],
    category: row.category as ReleaseFinding["category"],
    title: String(row.title),
    detail: String(row.detail ?? ""),
    status: row.status as ReleaseFinding["status"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function createSupabaseReleasesRepository(client: ReleasesSupabaseClient): ReleasesRepository {
  return {
    async listProjects(ownerId) {
      const { data, error } = await client
        .from("release_projects")
        .select("*")
        .eq("owner_id", ownerId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });
      if (error) throw new Error(error.message);
      return ((data as Record<string, unknown>[]) ?? []).map(mapProject);
    },

    async getBundle(ownerId, releaseId) {
      const { data: projectRow, error: pErr } = await client
        .from("release_projects")
        .select("*")
        .eq("id", releaseId)
        .eq("owner_id", ownerId)
        .is("deleted_at", null)
        .maybeSingle();
      if (pErr) throw new Error(pErr.message);
      if (!projectRow) return null;

      const { data: assets, error: aErr } = await client
        .from("release_assets")
        .select("*")
        .eq("release_id", releaseId)
        .eq("owner_id", ownerId);
      if (aErr) throw new Error(aErr.message);

      const { data: findings, error: fErr } = await client
        .from("release_findings")
        .select("*")
        .eq("release_id", releaseId)
        .eq("owner_id", ownerId);
      if (fErr) throw new Error(fErr.message);

      return {
        project: mapProject(projectRow as Record<string, unknown>),
        assets: ((assets as Record<string, unknown>[]) ?? []).map(mapAsset),
        findings: ((findings as Record<string, unknown>[]) ?? []).map(mapFinding),
      } satisfies ReleaseBundle;
    },

    async createProject(input: CreateReleaseInput) {
      if (input.idempotencyKey) {
        const { data: existing } = await client
          .from("release_projects")
          .select("*")
          .eq("owner_id", input.ownerId)
          .eq("idempotency_key", input.idempotencyKey)
          .is("deleted_at", null)
          .maybeSingle();
        if (existing) return mapProject(existing as Record<string, unknown>);
      }

      const draft = buildReleaseProject(input);
      const { data, error } = await client
        .from("release_projects")
        .insert({
          id: draft.id,
          owner_id: draft.ownerId,
          title: draft.title,
          artist_name: draft.artistName,
          status: draft.status,
          metadata: draft.metadata,
          idempotency_key: draft.idempotencyKey,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return mapProject(data as Record<string, unknown>);
    },

    async updateProject(ownerId, releaseId, patch: UpdateReleaseInput) {
      const bundle = await this.getBundle(ownerId, releaseId);
      if (!bundle) throw new Error("Release not found");
      const next = applyReleaseUpdate(bundle.project, patch);
      const { data, error } = await client
        .from("release_projects")
        .update({
          title: next.title,
          artist_name: next.artistName,
          status: next.status,
          metadata: next.metadata,
        })
        .eq("id", releaseId)
        .eq("owner_id", ownerId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return mapProject(data as Record<string, unknown>);
    },

    async softDeleteProject(ownerId, releaseId) {
      const { error } = await client
        .from("release_projects")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", releaseId)
        .eq("owner_id", ownerId);
      if (error) throw new Error(error.message);
    },

    async replaceAssets(ownerId, releaseId, assets) {
      const { error: delErr } = await client
        .from("release_assets")
        .delete()
        .eq("release_id", releaseId)
        .eq("owner_id", ownerId);
      if (delErr) throw new Error(delErr.message);

      if (assets.length === 0) return [];
      const rows = assets.map((a) => ({
        id: a.id,
        release_id: releaseId,
        owner_id: ownerId,
        kind: a.kind,
        file_name: a.fileName,
        mime_type: a.mimeType,
        size_bytes: a.sizeBytes,
        checksum: a.checksum,
        probe: a.probe,
      }));
      const { data, error } = await client.from("release_assets").insert(rows).select("*");
      if (error) throw new Error(error.message);
      return ((data as Record<string, unknown>[]) ?? []).map(mapAsset);
    },

    async replaceFindings(ownerId, releaseId, findings) {
      const { error: delErr } = await client
        .from("release_findings")
        .delete()
        .eq("release_id", releaseId)
        .eq("owner_id", ownerId);
      if (delErr) throw new Error(delErr.message);

      if (findings.length === 0) return [];
      const rows = findings.map((f) => ({
        id: f.id,
        release_id: releaseId,
        owner_id: ownerId,
        asset_id: f.assetId,
        code: f.code,
        severity: f.severity,
        category: f.category,
        title: f.title,
        detail: f.detail,
        status: f.status,
      }));
      const { data, error } = await client.from("release_findings").insert(rows).select("*");
      if (error) throw new Error(error.message);
      return ((data as Record<string, unknown>[]) ?? []).map(mapFinding);
    },
  };
}
