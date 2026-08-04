import {
  deriveReleaseStatus,
  evaluateReadiness,
  newId,
  type AudioProbe,
  type ArtworkProbe,
  type ReleaseAsset,
  type ReleaseBundle,
  type ReleaseFinding,
  type ReleaseProject,
} from "@vybz/domain/releases";
import {
  createLocalReleasesRepository,
  createSupabaseReleasesRepository,
  type ReleasesRepository,
} from "@vybz/data/releases";
import { createMemoryMutationQueue, type MutationQueueContract } from "@/platform/sync";
import { supabase } from "@/lib/supabase";

const LOCAL_OWNER = "local-prepare";

let repo: ReleasesRepository | null = null;
let queue: MutationQueueContract | null = null;

function memoryKv() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
}

function browserKv() {
  if (typeof localStorage === "undefined") return memoryKv();
  return localStorage;
}

/** E2E / two-user RLS harness: `sessionStorage['vybz.e2e.ownerId']` overrides owner. */
export function getPrepareOwnerId(sessionUserId: string | null | undefined): string {
  if (typeof sessionStorage !== "undefined") {
    try {
      const e2e = sessionStorage.getItem("vybz.e2e.ownerId");
      if (e2e) return e2e;
    } catch {
      /* private mode */
    }
  }
  return sessionUserId || LOCAL_OWNER;
}

export function getPrepareRepository(): ReleasesRepository {
  if (repo) return repo;
  const local = createLocalReleasesRepository(browserKv());
  if (supabase) {
    const remote = createSupabaseReleasesRepository(supabase);
    repo = createHybridRepository(local, remote);
  } else {
    repo = local;
  }
  return repo;
}

export function getPrepareMutationQueue(): MutationQueueContract {
  if (!queue) queue = createMemoryMutationQueue();
  return queue;
}

/** Prefer remote when signed in; always mirror to local for hard-refresh resilience. */
function createHybridRepository(local: ReleasesRepository, remote: ReleasesRepository): ReleasesRepository {
  return {
    async listProjects(ownerId) {
      if (ownerId === LOCAL_OWNER) return local.listProjects(ownerId);
      try {
        const rows = await remote.listProjects(ownerId);
        return rows;
      } catch {
        return local.listProjects(ownerId);
      }
    },
    async getBundle(ownerId, releaseId) {
      if (ownerId === LOCAL_OWNER) return local.getBundle(ownerId, releaseId);
      try {
        const bundle = await remote.getBundle(ownerId, releaseId);
        if (bundle) return bundle;
      } catch {
        /* fall through */
      }
      return local.getBundle(ownerId, releaseId);
    },
    async createProject(input) {
      const created = await local.createProject(input);
      if (input.ownerId !== LOCAL_OWNER) {
        try {
          return await remote.createProject(input);
        } catch {
          await getPrepareMutationQueue().enqueue({
            userId: input.ownerId,
            projectId: created.id,
            operation: "release.update_metadata",
            payload: { action: "create", project: created },
            idempotencyKey: input.idempotencyKey ?? created.id,
          });
        }
      }
      return created;
    },
    async updateProject(ownerId, releaseId, patch) {
      const updated = await local.updateProject(ownerId, releaseId, patch);
      if (ownerId !== LOCAL_OWNER) {
        try {
          return await remote.updateProject(ownerId, releaseId, patch);
        } catch {
          await getPrepareMutationQueue().enqueue({
            userId: ownerId,
            projectId: releaseId,
            operation: "release.update_metadata",
            payload: { action: "update", patch },
            idempotencyKey: `upd:${releaseId}:${updated.updatedAt}`,
          });
        }
      }
      return updated;
    },
    async softDeleteProject(ownerId, releaseId) {
      await local.softDeleteProject(ownerId, releaseId);
      if (ownerId !== LOCAL_OWNER) {
        try {
          await remote.softDeleteProject(ownerId, releaseId);
        } catch {
          await getPrepareMutationQueue().enqueue({
            userId: ownerId,
            projectId: releaseId,
            operation: "custom",
            payload: { action: "softDelete" },
            idempotencyKey: `del:${releaseId}`,
          });
        }
      }
    },
    async replaceAssets(ownerId, releaseId, assets) {
      const next = await local.replaceAssets(ownerId, releaseId, assets);
      if (ownerId !== LOCAL_OWNER) {
        try {
          return await remote.replaceAssets(ownerId, releaseId, assets);
        } catch {
          await getPrepareMutationQueue().enqueue({
            userId: ownerId,
            projectId: releaseId,
            operation: "release.attach_asset",
            payload: { assets },
            idempotencyKey: `assets:${releaseId}:${assets.map((a) => a.id).join(",")}`,
          });
        }
      }
      return next;
    },
    async replaceFindings(ownerId, releaseId, findings) {
      const next = await local.replaceFindings(ownerId, releaseId, findings);
      if (ownerId !== LOCAL_OWNER) {
        try {
          return await remote.replaceFindings(ownerId, releaseId, findings);
        } catch {
          await getPrepareMutationQueue().enqueue({
            userId: ownerId,
            projectId: releaseId,
            operation: "finding.resolve",
            payload: { findings },
            idempotencyKey: `findings:${releaseId}:${findings.length}`,
          });
        }
      }
      return next;
    },
  };
}

export async function createReleaseWithScan(opts: {
  ownerId: string;
  title: string;
  artistName?: string | null;
  audio?: { fileName: string; mimeType: string; sizeBytes: number; probe: AudioProbe } | null;
  artwork?: { fileName: string; mimeType: string; sizeBytes: number; probe: ArtworkProbe } | null;
  idempotencyKey?: string;
}): Promise<ReleaseBundle> {
  const repository = getPrepareRepository();
  const project = await repository.createProject({
    ownerId: opts.ownerId,
    title: opts.title,
    artistName: opts.artistName,
    idempotencyKey: opts.idempotencyKey,
  });

  const assets: Omit<ReleaseAsset, "createdAt">[] = [];
  if (opts.audio) {
    assets.push({
      id: newId(),
      releaseId: project.id,
      ownerId: opts.ownerId,
      kind: "audio",
      fileName: opts.audio.fileName,
      mimeType: opts.audio.mimeType,
      sizeBytes: opts.audio.sizeBytes,
      checksum: null,
      probe: opts.audio.probe as unknown as Record<string, unknown>,
    });
  }
  if (opts.artwork) {
    assets.push({
      id: newId(),
      releaseId: project.id,
      ownerId: opts.ownerId,
      kind: "artwork",
      fileName: opts.artwork.fileName,
      mimeType: opts.artwork.mimeType,
      sizeBytes: opts.artwork.sizeBytes,
      checksum: null,
      probe: opts.artwork.probe as unknown as Record<string, unknown>,
    });
  }
  const savedAssets = await repository.replaceAssets(opts.ownerId, project.id, assets);

  const drafts = evaluateReadiness({
    title: project.title,
    artistName: project.artistName,
    hasAudio: Boolean(opts.audio),
    hasArtwork: Boolean(opts.artwork),
    audio: opts.audio?.probe ?? null,
    artwork: opts.artwork?.probe ?? null,
  });

  const findings: Omit<ReleaseFinding, "createdAt" | "updatedAt">[] = drafts.map((d) => ({
    id: newId(),
    releaseId: project.id,
    ownerId: opts.ownerId,
    assetId: null,
    code: d.code,
    severity: d.severity,
    category: d.category,
    title: d.title,
    detail: d.detail,
    status: "open",
  }));

  const savedFindings = await repository.replaceFindings(opts.ownerId, project.id, findings);
  const status = deriveReleaseStatus(savedFindings);
  const updated = await repository.updateProject(opts.ownerId, project.id, { status });

  return { project: updated, assets: savedAssets, findings: savedFindings };
}

export async function listReleases(ownerId: string): Promise<ReleaseProject[]> {
  return getPrepareRepository().listProjects(ownerId);
}

export async function getReleaseBundle(ownerId: string, id: string): Promise<ReleaseBundle | null> {
  return getPrepareRepository().getBundle(ownerId, id);
}

export async function flushPrepareQueue(ownerId: string): Promise<void> {
  if (ownerId === LOCAL_OWNER || !supabase) return;
  const q = getPrepareMutationQueue();
  const pending = await q.list();
  const remote = createSupabaseReleasesRepository(supabase);
  for (const item of pending) {
    if (item.userId !== ownerId) continue;
    try {
      const payload = item.payload as { action?: string; project?: ReleaseProject; patch?: Record<string, unknown> };
      if (payload.action === "create" && payload.project) {
        await remote.createProject({
          ownerId,
          title: payload.project.title,
          artistName: payload.project.artistName,
          idempotencyKey: payload.project.idempotencyKey,
        });
      } else if (payload.action === "update" && payload.patch) {
        await remote.updateProject(ownerId, item.projectId, payload.patch);
      }
      await q.remove(item.id);
    } catch {
      await q.incrementAttempts(item.id);
    }
  }
}
