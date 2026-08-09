import type { PerceptionContext } from "./context";
import type { MediaKind, ModuleCollectResult } from "./types";

export interface PerceptionModule {
  id: string;
  mediaKind: MediaKind;
  collect: (ctx: PerceptionContext) => ModuleCollectResult | Promise<ModuleCollectResult>;
}

export class PerceptionRegistry {
  private readonly modules = new Map<string, PerceptionModule>();

  register(module: PerceptionModule): void {
    if (this.modules.has(module.id)) {
      throw new Error(`Perception module already registered: ${module.id}`);
    }
    this.modules.set(module.id, module);
  }

  get(id: string): PerceptionModule | undefined {
    return this.modules.get(id);
  }

  list(): PerceptionModule[] {
    return [...this.modules.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  listByMedia(kind: MediaKind): PerceptionModule[] {
    return this.list().filter((m) => m.mediaKind === kind);
  }
}

export function createDefaultRegistry(): PerceptionRegistry {
  return new PerceptionRegistry();
}
