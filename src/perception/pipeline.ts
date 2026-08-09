import type { ObservationCatalog } from "./catalog";
import { mergeCatalog } from "./catalog";
import type { PerceptionContext } from "./context";
import { assertPerceptionContext } from "./context";
import type { PerceptionGraph } from "./graph";
import { emptyGraph, mergeGraphs } from "./graph";
import type { ModelProvider, PerceptionBundle, ReasoningResult, ReasoningTier } from "./modelProvider";
import { NoopModelProvider } from "./modelProvider";
import type { PerceptionRegistry } from "./registry";
import type { Observation, ObservationDraft, PerceptionEdge, PerceptionEdgeDraft } from "./types";

export interface RunPerceptionInput {
  registry: PerceptionRegistry;
  context: PerceptionContext;
  /** Module ids to run; default = all registered */
  moduleIds?: string[];
  catalog?: ObservationCatalog;
  graph?: PerceptionGraph;
  runId: string;
  appSha: string;
  /** If set, reason() is called only AFTER detect/catalog/graph */
  modelProvider?: ModelProvider;
  reasoningTier?: ReasoningTier;
}

export interface RunPerceptionResult {
  context: PerceptionContext;
  observations: Observation[];
  edges: PerceptionEdge[];
  catalog: ObservationCatalog;
  graph: PerceptionGraph;
  reasoning?: ReasoningResult;
  /** True if ModelProvider.reason was invoked */
  reasoned: boolean;
}

/**
 * Detect → normalize/catalog → graph, then optional ModelProvider.
 * Engine does heavy lifting before any LLM call.
 */
export async function runPerception(
  input: RunPerceptionInput,
): Promise<RunPerceptionResult> {
  assertPerceptionContext(input.context);

  const modules = input.moduleIds
    ? input.moduleIds.map((id) => {
        const m = input.registry.get(id);
        if (!m) throw new Error(`Unknown perception module: ${id}`);
        return m;
      })
    : input.registry.list();

  const drafts: ObservationDraft[] = [];
  const edgeDrafts: PerceptionEdgeDraft[] = [];
  for (const mod of modules) {
    const collected = await mod.collect(input.context);
    drafts.push(...collected.observations);
    edgeDrafts.push(...collected.edges);
  }

  const { observations, catalog } = mergeCatalog({
    catalog: input.catalog ?? {},
    drafts,
    runId: input.runId,
    appSha: input.appSha,
  });

  const graph = mergeGraphs(input.graph ?? emptyGraph(), edgeDrafts);
  const edges = graph.edges;

  const bundle: PerceptionBundle = {
    context: input.context,
    observations,
    edges,
  };

  let reasoning: ReasoningResult | undefined;
  let reasoned = false;
  const tier = input.reasoningTier ?? "none";
  if (tier !== "none" && input.modelProvider) {
    reasoning = await input.modelProvider.reason(bundle, tier);
    reasoned = true;
  } else if (tier !== "none" && !input.modelProvider) {
    const noop = new NoopModelProvider();
    reasoning = await noop.reason(bundle, tier);
    reasoned = true;
  }

  return {
    context: input.context,
    observations,
    edges,
    catalog,
    graph,
    reasoning,
    reasoned,
  };
}
