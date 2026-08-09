import { describe, expect, it, vi } from "vitest";
import { mergeCatalog } from "./catalog";
import { assertPerceptionContext, type PerceptionContext } from "./context";
import { emptyGraph, mergeGraphs } from "./graph";
import { isObservationId, mintEdgeId, mintObservationId } from "./ids";
import type { ModelProvider, PerceptionBundle, ReasoningResult } from "./modelProvider";
import { NoopModelProvider } from "./modelProvider";
import { createAudioPerceptionModuleStub } from "./modules/audio";
import { createImagePerceptionModuleStub } from "./modules/image";
import {
  createWebsiteReviewModule,
  REQUIRED_PROD_SURFACE_IDS,
  WEBSITE_REVIEW_PROD_SURFACES,
} from "./modules/websiteReview";
import { runPerception } from "./pipeline";
import { createDefaultRegistry } from "./registry";
import type { ObservationDraft, Origin } from "./types";

const ORIGIN: Origin = {
  detector: "test.detector",
  version: "1.0.0",
  sourceType: "web",
};

const CTX: PerceptionContext = {
  projectId: "vybz-app",
  artifactId: "test-artifact",
  version: "Not measured",
  sessionId: "session-1",
};

describe("Perception Engine — IDs", () => {
  it("mints deterministic human-readable observation IDs", () => {
    const a = mintObservationId({ surface: "Library", slug: "Empty State" });
    const b = mintObservationId({ surface: "library", slug: "empty-state" });
    expect(a).toBe("library.empty-state");
    expect(b).toBe("library.empty-state");
    expect(isObservationId(a)).toBe(true);
    expect(isObservationId("finding-42")).toBe(false);
  });

  it("mints deterministic edge IDs", () => {
    const id = mintEdgeId({
      from: "library.empty-state",
      to: "home.surface-reachable",
      relation: "depends_on",
    });
    expect(id).toBe("edge.library-empty-state.depends-on.home-surface-reachable");
    expect(
      mintEdgeId({
        from: "library.empty-state",
        to: "home.surface-reachable",
        relation: "depends_on",
      }),
    ).toBe(id);
  });
});

describe("Perception Engine — provenance & context", () => {
  it("requires PerceptionContext fields", () => {
    expect(() =>
      assertPerceptionContext({
        projectId: "",
        artifactId: "a",
        version: "v",
        sessionId: "s",
      }),
    ).toThrow(/projectId/);
  });

  it("requires origin on observation drafts used in catalog", () => {
    const draft: ObservationDraft = {
      id: mintObservationId({ surface: "library", slug: "empty-state" }),
      surface: "library",
      category: "empty-state",
      severity: "notice",
      confidence: "high",
      evidence: {},
      summary: "Library shows empty state copy",
      origin: ORIGIN,
    };
    expect(draft.origin.detector).toBe("test.detector");
    expect(draft.origin.version).toBe("1.0.0");
    expect(draft.origin.sourceType).toBe("web");
  });
});

describe("Perception Engine — catalog lifecycle", () => {
  it("transitions new → seen → regressed", () => {
    const draft: ObservationDraft = {
      id: "library.empty-state",
      surface: "library",
      category: "empty-state",
      severity: "notice",
      confidence: "high",
      evidence: {},
      summary: "empty",
      origin: ORIGIN,
    };

    const first = mergeCatalog({
      catalog: {},
      drafts: [draft],
      runId: "run-1",
      appSha: "aaa",
    });
    expect(first.observations[0]?.lifecycle).toBe("new");

    const second = mergeCatalog({
      catalog: first.catalog,
      drafts: [draft],
      runId: "run-2",
      appSha: "bbb",
    });
    expect(second.observations[0]?.lifecycle).toBe("seen");
    expect(second.observations[0]?.firstSeenRun).toBe("run-1");

    const cleared = mergeCatalog({
      catalog: second.catalog,
      drafts: [],
      runId: "run-3",
      appSha: "ccc",
    });
    expect(cleared.catalog["library.empty-state"]?.observation.lifecycle).toBe("stale");

    const back = mergeCatalog({
      catalog: cleared.catalog,
      drafts: [draft],
      runId: "run-4",
      appSha: "ddd",
    });
    expect(back.observations[0]?.lifecycle).toBe("regressed");
  });
});

describe("Perception Engine — graph", () => {
  it("merges edges by deterministic id within a graph", () => {
    const g1 = mergeGraphs(emptyGraph(), [
      {
        from: "a.x",
        to: "b.y",
        relation: "contains",
        confidence: "high",
        origin: ORIGIN,
      },
    ]);
    expect(g1.edges).toHaveLength(1);
    const g2 = mergeGraphs(g1, [
      {
        from: "a.x",
        to: "b.y",
        relation: "contains",
        confidence: "medium",
        origin: ORIGIN,
      },
    ]);
    expect(g2.edges).toHaveLength(1);
    expect(g2.edges[0]?.confidence).toBe("medium");
  });
});

describe("Perception Engine — pipeline invariant", () => {
  it("does not call ModelProvider before detect completes", async () => {
    const order: string[] = [];
    const registry = createDefaultRegistry();
    registry.register({
      id: "probe",
      mediaKind: "web",
      collect: () => {
        order.push("detect");
        return {
          observations: [
            {
              id: mintObservationId({ surface: "home", slug: "ok" }),
              surface: "home",
              category: "chrome",
              severity: "info",
              confidence: "high",
              evidence: {},
              summary: "ok",
              origin: ORIGIN,
            },
          ],
          edges: [],
        };
      },
    });

    const provider: ModelProvider = {
      id: "spy",
      reason: async (_b: PerceptionBundle): Promise<ReasoningResult> => {
        order.push("reason");
        expect(order[0]).toBe("detect");
        return { tier: "free", providerId: "spy" };
      },
    };

    const spy = vi.spyOn(provider, "reason");
    const result = await runPerception({
      registry,
      context: CTX,
      runId: "run-spy",
      appSha: "sha",
      modelProvider: provider,
      reasoningTier: "free",
    });

    expect(order).toEqual(["detect", "reason"]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(result.reasoned).toBe(true);
    expect(result.observations).toHaveLength(1);
  });

  it("skips ModelProvider when tier is none", async () => {
    const registry = createDefaultRegistry();
    registry.register(createWebsiteReviewModule());
    const provider = new NoopModelProvider();
    const spy = vi.spyOn(provider, "reason");
    const result = await runPerception({
      registry,
      context: CTX,
      moduleIds: ["website-review"],
      runId: "run-none",
      appSha: "sha",
      modelProvider: provider,
      reasoningTier: "none",
    });
    expect(spy).not.toHaveBeenCalled();
    expect(result.reasoned).toBe(false);
  });
});

describe("Perception modules", () => {
  it("registers website-review and covers required prod surfaces", () => {
    const registry = createDefaultRegistry();
    registry.register(createWebsiteReviewModule());
    const mod = registry.get("website-review");
    expect(mod?.mediaKind).toBe("web");
    const ids = WEBSITE_REVIEW_PROD_SURFACES.map((s) => s.id).sort();
    expect(ids).toEqual([...REQUIRED_PROD_SURFACE_IDS].sort());
    const collected = mod!.collect(CTX) as {
      observations: ObservationDraft[];
      edges: unknown[];
    };
    expect(collected.observations.length).toBe(REQUIRED_PROD_SURFACE_IDS.length);
    expect(collected.edges.length).toBeGreaterThan(0);
    for (const o of collected.observations) {
      expect(o.origin.sourceType).toBe("web");
      expect(isObservationId(o.id)).toBe(true);
    }
  });

  it("audio and image stubs register without emitting observations", () => {
    const registry = createDefaultRegistry();
    registry.register(createAudioPerceptionModuleStub());
    registry.register(createImagePerceptionModuleStub());
    expect(registry.get("audio-stub")?.collect(CTX)).toEqual({
      observations: [],
      edges: [],
    });
    expect(registry.get("image-stub")?.collect(CTX)).toEqual({
      observations: [],
      edges: [],
    });
  });
});
