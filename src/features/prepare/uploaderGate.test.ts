/**
 * Uploader gate — intake sends bytes before it asks questions.
 *
 * The defect this encodes: a drop reached 100% and then appeared to do nothing,
 * because the sheet removed its progress bar and then hashed the whole file on
 * the main thread with no indicator. So the rules are that no phase is silent,
 * nothing optional can block a drop, a dead connection is detected rather than
 * waited on, and intake asks only the questions a track actually needs.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GATE_REGISTRY } from "@/product/invariants";
import { canReleaseItem, createUploadItem, itemStatusLabel } from "@/features/upload/uploadQueue";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

/**
 * Strip comments before asserting a term is absent, so that documenting a rule
 * cannot break the test that enforces it.
 */
function code(rel: string): string {
  return read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map((line) => line.replace(/(^|\s)(--|\/\/).*$/, ""))
    .join("\n");
}

const COMPOSE = "src/components/ComposeSheet.tsx";
const QUEUE = "src/features/upload/uploadQueue.ts";

describe("uploader", () => {
  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("uploader");
  });

  it("starts sending on enqueue, not on release", () => {
    const queue = code(QUEUE);
    // enqueueUploads must reach pump() itself; if releasing were what started
    // the upload, the form would be a toll booth again.
    expect(queue).toMatch(/export function enqueueUploads[\s\S]*?pump\(\)/);
    expect(code(COMPOSE)).toContain("enqueueUploads");
  });

  it("measures the file beside the upload rather than in front of it", () => {
    const queue = code(QUEUE);
    const enqueue = queue.slice(queue.indexOf("export function enqueueUploads"));
    // Both kicked off without await, so neither delays the first byte.
    expect(enqueue).toMatch(/void analyze\(/);
    expect(enqueue).toMatch(/void readId3Tags\(/);
  });

  it("never leaves a phase without a label", () => {
    const statuses = ["reading", "uploading", "analyzing", "ready", "failed", "released"] as const;
    const base = createUploadItem(new File([new Uint8Array(1)], "a.wav", { type: "audio/wav" }), "i", 1);
    for (const status of statuses) {
      expect(itemStatusLabel({ ...base, status }).trim(), status).not.toBe("");
    }
  });

  it("says bytes-sent is not acceptance, which is the whole defect", () => {
    const base = createUploadItem(new File([new Uint8Array(1)], "a.wav", { type: "audio/wav" }), "i", 1);
    expect(itemStatusLabel({ ...base, status: "uploading", percent: 100 })).toMatch(/finalizing/i);
  });

  it("does not let a hash decide whether a drop exists", () => {
    // Release needs bytes on the server. It must not also need a hash, or a slow
    // hash becomes a lost drop — which is exactly what happened.
    const base = createUploadItem(new File([new Uint8Array(1)], "a.wav", { type: "audio/wav" }), "i", 1);
    expect(canReleaseItem({ ...base, status: "ready", path: "u/drops/a.wav" })).toBe(true);
    expect(canReleaseItem({ ...base, status: "ready", path: "u/drops/a.wav", sha256: undefined })).toBe(true);
    expect(canReleaseItem({ ...base, status: "uploading", percent: 100, path: null })).toBe(false);
  });

  it("hashes off the main thread behind a guard", () => {
    expect(existsSync(path.join(ROOT, "src/lib/sha256.worker.ts"))).toBe(true);
    const guard = code("src/lib/sha256Worker.ts");
    expect(guard).toMatch(/hashBlobGuarded/);
    // Every failure path resolves rather than rejecting, so nothing upstream hangs.
    expect(guard).toMatch(/timeout|TIMEOUT/i);
  });

  it("aborts an upload that has gone silent instead of waiting forever", () => {
    const api = code("src/lib/api.ts");
    expect(api).toMatch(/watchUploadForStall/);
    expect(api).toMatch(/UPLOAD_STALL_MS/);
    // A total-duration cap would kill large masters that are working fine.
    expect(api).not.toMatch(/xhr\.timeout\s*=/);
  });

  it("asks no asset-kind question — intake only makes tracks", () => {
    const compose = code(COMPOSE);
    expect(compose).not.toMatch(/AssetKind/);
    expect(compose).not.toMatch(/One-shot|Acapella/);
    expect(code(QUEUE)).toMatch(/assetKind: "track"/);
  });

  it("carries no stage dressing into intake", () => {
    const compose = code(COMPOSE);
    expect(compose).not.toMatch(/VisualPicker/);
    expect(compose).not.toMatch(/backdropDim|backdropFit|vdockVisualId/);
    expect(compose).not.toMatch(/buildPlaybackCustomization/);
  });

  it("hides the album uploader without deleting it", () => {
    // Preservation: the surface leaves navigation, the file stays compiling.
    expect(existsSync(path.join(ROOT, "src/components/BulkUploadSheet.tsx"))).toBe(true);
    expect(code("src/App.tsx")).not.toMatch(/BulkUploadSheet/);
  });

  it("keeps the originality claim, which is a product rule and not chrome", () => {
    expect(code(COMPOSE)).toMatch(/OriginalityClaim/);
  });
});
