/**
 * Capacitor App URL open listener — wires deep links into SPA navigation.
 * Safe no-op when Cap App plugin is unavailable (web / tests).
 */

import { parseDeepLink, deepLinkToAppPath } from "@/platform/deeplinks/index";

export type NavigateFn = (path: string) => void;

export async function bindCapacitorDeepLinks(navigate: NavigateFn): Promise<() => void> {
  try {
    const { App } = await import("@capacitor/app");
    const handle = await App.addListener("appUrlOpen", (event) => {
      const link = parseDeepLink(event.url);
      const path = deepLinkToAppPath(link);
      if (path) navigate(path);
    });
    return () => {
      void handle.remove();
    };
  } catch {
    return () => undefined;
  }
}
