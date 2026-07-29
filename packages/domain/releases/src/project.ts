import type { CreateReleaseInput, ReleaseProject, UpdateReleaseInput } from "./types";

export function newId(): string {
  // crypto.randomUUID is available in modern runtimes (browser, worker, Node 20+)
  // without importing DOM types into domain consumers.
  const c = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `rel_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

export function buildReleaseProject(input: CreateReleaseInput, now = new Date().toISOString()): ReleaseProject {
  const title = input.title.trim() || "Untitled release";
  return {
    id: newId(),
    ownerId: input.ownerId,
    title,
    artistName: input.artistName?.trim() || null,
    status: "draft",
    metadata: input.metadata ?? {},
    idempotencyKey: input.idempotencyKey ?? null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

export function applyReleaseUpdate(
  project: ReleaseProject,
  patch: UpdateReleaseInput,
  now = new Date().toISOString()
): ReleaseProject {
  return {
    ...project,
    title: patch.title !== undefined ? patch.title.trim() || project.title : project.title,
    artistName: patch.artistName !== undefined ? patch.artistName : project.artistName,
    status: patch.status ?? project.status,
    metadata: patch.metadata ?? project.metadata,
    updatedAt: now,
  };
}
