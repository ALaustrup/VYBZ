/**
 * Scopes catalog merges and graph queries so cross-project questions stay trivial later.
 */

export interface PerceptionContext {
  /** Stable project / workspace key (e.g. vybz-app) */
  projectId: string;
  /** Subject under review (run id, release id, page set, …) */
  artifactId: string;
  /** Artifact or app version / git SHA when known; else "Not measured" */
  version: string;
  /** One perception session / walk / analysis pass */
  sessionId: string;
}

export function assertPerceptionContext(ctx: PerceptionContext): void {
  if (!ctx.projectId.trim()) throw new Error("PerceptionContext.projectId required");
  if (!ctx.artifactId.trim()) throw new Error("PerceptionContext.artifactId required");
  if (!ctx.version.trim()) throw new Error("PerceptionContext.version required");
  if (!ctx.sessionId.trim()) throw new Error("PerceptionContext.sessionId required");
}

export function contextKey(ctx: PerceptionContext): string {
  return `${ctx.projectId}::${ctx.artifactId}`;
}
