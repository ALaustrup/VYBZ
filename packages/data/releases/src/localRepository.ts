import {
  applyReleaseUpdate,
  buildReleaseProject,
  type CreateReleaseInput,
  type ReleaseAsset,
  type ReleaseBundle,
  type ReleaseFinding,
  type ReleaseProject,
  type UpdateReleaseInput,
} from "@vybz/domain/releases";
import type { KvStore, ReleasesRepository } from "./types";

type StoreShape = {
  projects: ReleaseProject[];
  assets: ReleaseAsset[];
  findings: ReleaseFinding[];
};

const EMPTY: StoreShape = { projects: [], assets: [], findings: [] };

/**
 * Local durable repository (injected KvStore — typically localStorage).
 * No direct browser globals; caller injects storage.
 */
export function createLocalReleasesRepository(
  store: KvStore,
  storageKey = "vybz.prepare.releases.v1"
): ReleasesRepository {
  const read = (): StoreShape => {
    try {
      const raw = store.getItem(storageKey);
      if (!raw) return { ...EMPTY, projects: [], assets: [], findings: [] };
      const parsed = JSON.parse(raw) as StoreShape;
      return {
        projects: parsed.projects ?? [],
        assets: parsed.assets ?? [],
        findings: parsed.findings ?? [],
      };
    } catch {
      return { projects: [], assets: [], findings: [] };
    }
  };

  const write = (data: StoreShape) => {
    store.setItem(storageKey, JSON.stringify(data));
  };

  return {
    async listProjects(ownerId) {
      return read()
        .projects.filter((p) => p.ownerId === ownerId && !p.deletedAt)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async getBundle(ownerId, releaseId) {
      const data = read();
      const project = data.projects.find((p) => p.id === releaseId && p.ownerId === ownerId && !p.deletedAt);
      if (!project) return null;
      return {
        project,
        assets: data.assets.filter((a) => a.releaseId === releaseId && a.ownerId === ownerId),
        findings: data.findings.filter((f) => f.releaseId === releaseId && f.ownerId === ownerId),
      };
    },

    async createProject(input: CreateReleaseInput) {
      const data = read();
      if (input.idempotencyKey) {
        const existing = data.projects.find(
          (p) =>
            p.ownerId === input.ownerId &&
            p.idempotencyKey === input.idempotencyKey &&
            !p.deletedAt
        );
        if (existing) return existing;
      }
      const project = buildReleaseProject(input);
      data.projects.push(project);
      write(data);
      return project;
    },

    async updateProject(ownerId, releaseId, patch: UpdateReleaseInput) {
      const data = read();
      const idx = data.projects.findIndex((p) => p.id === releaseId && p.ownerId === ownerId && !p.deletedAt);
      if (idx < 0) throw new Error("Release not found");
      const next = applyReleaseUpdate(data.projects[idx]!, patch);
      data.projects[idx] = next;
      write(data);
      return next;
    },

    async softDeleteProject(ownerId, releaseId) {
      const data = read();
      const idx = data.projects.findIndex((p) => p.id === releaseId && p.ownerId === ownerId);
      if (idx < 0) return;
      data.projects[idx] = {
        ...data.projects[idx]!,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      write(data);
    },

    async replaceAssets(ownerId, releaseId, assets) {
      const data = read();
      data.assets = data.assets.filter((a) => !(a.releaseId === releaseId && a.ownerId === ownerId));
      const now = new Date().toISOString();
      const next = assets.map((a) => ({ ...a, ownerId, releaseId, createdAt: now }));
      data.assets.push(...next);
      write(data);
      return next;
    },

    async replaceFindings(ownerId, releaseId, findings) {
      const data = read();
      data.findings = data.findings.filter((f) => !(f.releaseId === releaseId && f.ownerId === ownerId));
      const now = new Date().toISOString();
      const next = findings.map((f) => ({
        ...f,
        ownerId,
        releaseId,
        createdAt: now,
        updatedAt: now,
      }));
      data.findings.push(...next);
      write(data);
      return next;
    },
  };
}

export type { ReleaseBundle };
