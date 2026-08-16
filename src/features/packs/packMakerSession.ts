/**
 * Pack Maker working set — survives leaving the page.
 *
 * Samples stay in memory for the tab. The ZIP handoff is a separate object URL
 * written when the producer continues from stage 5 (or taps To storefront).
 */
import { useSyncExternalStore } from "react";
import { buildPackZip, type AssembledSample } from "@/features/packs/packAssemble";
import { savePackHandoff } from "@/features/packs/packHandoff";

export type PackMakerSession = {
  title: string;
  samples: AssembledSample[];
  lastZipSha: string | null;
  lastContentSha: string | null;
};

const EMPTY: PackMakerSession = {
  title: "untitled-pack",
  samples: [],
  lastZipSha: null,
  lastContentSha: null,
};

let session: PackMakerSession = { ...EMPTY, samples: [] };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function getPackMakerSession(): PackMakerSession {
  return session;
}

export function setPackMakerSession(partial: Partial<PackMakerSession>) {
  session = { ...session, ...partial };
  emit();
}

export function resetPackMakerSession() {
  session = { ...EMPTY, samples: [] };
  emit();
}

export type PackHandoffResult = "ok" | "empty" | "failed";

export async function handoffPackMakerToStorefront(): Promise<PackHandoffResult> {
  if (!session.samples.length) return "empty";
  try {
    const { zip, manifest, zipSha256 } = await buildPackZip({
      title: session.title,
      samples: session.samples,
    });
    session = {
      ...session,
      lastZipSha: zipSha256,
      lastContentSha: manifest.contentSha256,
    };
    emit();
    const blob = new Blob([new Uint8Array(zip)], { type: "application/zip" });
    const fileName = `${(session.title || "vybz-pack").replace(/[^\w.-]+/g, "_").slice(0, 48)}.zip`;
    savePackHandoff({ title: session.title, fileName, blob });
    return "ok";
  } catch {
    return "failed";
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePackMakerSession(): PackMakerSession {
  return useSyncExternalStore(subscribe, getPackMakerSession, getPackMakerSession);
}
