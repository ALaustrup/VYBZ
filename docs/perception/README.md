# Perception Engine

**Product IP.** Detectors, stable observation IDs, Perception Context, Perception Graph, and catalog history are the foundation. **ModelProvider is a pluggable implementation detail** — swap vendors later without rewriting the engine.

Website review is the **first module**, not a one-off. Future audio, image, and cross-media modules share the same IDs, evidence, history, context, and graph.

**Hard boundary:** Perception outputs are observations (and relationships). They are **not** implementation instructions. **artifact ≠ build order.**

## Linear phase roadmap

| Phase | State | Deliverable |
|---|---|---|
| **0** | Shipped | Fixture AI review portal (`npm run ai-review`) |
| **1B** | Accepted / in this branch | Stable observation identity (human-readable IDs, metadata, history, evidence) |
| **2** | This branch | Perception Engine contracts — registry, origin, context, graph, pluggable model, module stubs |
| **3** | This branch | Live prod walker (`npm run ai-review:prod`) emitting engine observations |
| **Later** | Parked | Audio / image perception algorithms, cross-media reasoning, entity population, real LLM providers, billing tiers |

Do not skip ahead into parked phases without owner authorisation.

## Doctrine

1. **Detect first** — engine heavy lifting (IDs, evidence, provenance, graph) before any LLM call.  
2. **Pluggable models** — `NoopModelProvider` ships now; Groq/OpenAI/etc. wire later at the edge.  
3. **Tiers (contract only)** — Free = engine + basic analysis; Premium = deeper reasoning. No Stripe UI in this phase.  
4. **Modules register** — no parallel one-off AI pipelines.  
5. **Entity layer** — defined lightly only; see [SCHEMA.md](./SCHEMA.md#entity-layer-reserved). Observations may attach via `entityId` later.

## Code

- Contracts: [`src/perception/`](../../src/perception/)  
- Website-review sink: [`docs/ai-review/`](../ai-review/)  
- Cursor rule: `.cursor/rules/perception-engine.mdc`

## Commands

```bash
# Stage 1a — fixture portal
npm run ai-review

# Stage 1b — live prod walk (requires AI_REVIEW_EMAIL + AI_REVIEW_PASSWORD)
npm run ai-review:prod
```
