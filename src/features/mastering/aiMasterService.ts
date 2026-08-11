/**
 * Phase 15 — local/remote AI mastering + metadata job runner.
 * Local/e2e uses DSP + fixture paths; remote uses Edge when session available.
 */

import {
  masterWavBuffer,
  type MasteringMetrics,
  type MasteringResult,
} from "@vybz/processing/mastering";
import {
  inferMetadataLocal,
  type InferredMetadata,
} from "@vybz/processing/metadata";
import { isFeatureKillSwitched } from "@/platform/costs/edgeFlags";
import { PlatformError } from "@/platform/bridge/errors";
import { PORTABLE_FFT_MAX_BYTES } from "@vybz/processing/waveform";

export type AiJobStatus = "queued" | "processing" | "completed" | "failed" | "canceled";

export type AiMasterJob = {
  jobId: string;
  projectId?: string;
  status: AiJobStatus;
  progress: number;
  engine: "portable" | "remote";
  createdAt: string;
  error?: string;
  metrics?: MasteringMetrics;
  /** Object URL for mastered WAV (revoke on replace). */
  masteredUrl?: string;
  originalUrl?: string;
  masteredBlob?: Blob;
  metadata?: InferredMetadata;
};

type JobStore = Map<string, AiMasterJob>;

const jobs: JobStore = new Map();
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

export function subscribeAiJobs(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getAiJob(jobId: string): AiMasterJob | undefined {
  return jobs.get(jobId);
}

export function listAiJobs(projectId?: string): AiMasterJob[] {
  const all = [...jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return projectId ? all.filter((j) => j.projectId === projectId) : all;
}

function newId(): string {
  return crypto.randomUUID();
}

/** Kill-switch only — no prepaid AI-minute / credit balance gate. */
export async function assertAiMasteringAllowed(_extraSeconds = 0): Promise<void> {
  if (isFeatureKillSwitched("ai_mastering") || isFeatureKillSwitched("processing")) {
    throw new PlatformError(
      "validation",
      "AI mastering disabled by feature kill-switch (feature:ai_mastering:disabled)"
    );
  }
}

async function readAudioBytes(file: Blob | ArrayBuffer): Promise<ArrayBuffer> {
  if (file instanceof ArrayBuffer) return file;
  if (typeof file.arrayBuffer === "function") return file.arrayBuffer();
  // jsdom Blob polyfill may lack arrayBuffer()
  return await new Response(file).arrayBuffer();
}

/**
 * Run Analyze & Master locally (DSP). Used for clips under portable limit and e2e.
 */
export async function runLocalMasterJob(opts: {
  projectId?: string;
  file: Blob | ArrayBuffer;
  fileName?: string;
  inferMeta?: boolean;
  fixtureMeta?: boolean;
  onProgress?: (pct: number) => void;
}): Promise<AiMasterJob> {
  const buf = await readAudioBytes(opts.file);
  const durationGuess = Math.max(0.5, buf.byteLength / (8000 * 2));
  await assertAiMasteringAllowed(durationGuess);

  const jobId = newId();
  const originalBlob =
    opts.file instanceof ArrayBuffer
      ? new Blob([opts.file as BlobPart], { type: "audio/wav" })
      : opts.file;
  const originalUrl =
    typeof URL !== "undefined" && typeof URL.createObjectURL === "function"
      ? URL.createObjectURL(originalBlob)
      : undefined;
  let job: AiMasterJob = {
    jobId,
    projectId: opts.projectId,
    status: "queued",
    progress: 0,
    engine: "portable",
    createdAt: new Date().toISOString(),
    originalUrl,
  };
  jobs.set(jobId, job);
  notify();

  const tick = (status: AiJobStatus, progress: number, patch?: Partial<AiMasterJob>) => {
    job = { ...job, status, progress, ...patch };
    jobs.set(jobId, job);
    opts.onProgress?.(progress);
    notify();
  };

  try {
    tick("processing", 15);
    await new Promise((r) => setTimeout(r, 40));
    tick("processing", 45);
    const mastered: MasteringResult = masterWavBuffer(buf, {
      targetRmsDbfs: -14,
      peakCeiling: 0.95,
      stereoWidth: 1.05,
    });
    tick("processing", 75);
    const masteredBlob = new Blob([mastered.wav as BlobPart], { type: "audio/wav" });
    const masteredUrl =
      typeof URL !== "undefined" && typeof URL.createObjectURL === "function"
        ? URL.createObjectURL(masteredBlob)
        : undefined;

    let metadata: InferredMetadata | undefined;
    if (opts.inferMeta !== false) {
      metadata = inferMetadataLocal({
        fixture: opts.fixtureMeta,
        title: opts.fileName,
        durationSeconds: mastered.metrics.durationSeconds,
      });
    }

    tick("completed", 100, {
      metrics: mastered.metrics,
      masteredBlob,
      masteredUrl,
      metadata,
    });
    return job;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Mastering failed";
    tick("failed", job.progress, { error: message });
    throw err;
  }
}

/** Bridge helper: files larger than portable FFT limit should use remote engine. */
export function shouldUseRemoteAnalyze(sizeBytes: number): boolean {
  return sizeBytes > PORTABLE_FFT_MAX_BYTES;
}

export function resetAiJobStore(): void {
  for (const j of jobs.values()) {
    if (j.originalUrl) URL.revokeObjectURL(j.originalUrl);
    if (j.masteredUrl) URL.revokeObjectURL(j.masteredUrl);
  }
  jobs.clear();
  notify();
}
