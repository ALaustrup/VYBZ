import type { AudioProbe, ArtworkProbe } from "@vybz/domain/releases";
import type { WorkerProbeRequest, WorkerProbeResponse } from "@vybz/processing/readiness";
import ReadinessWorker from "./readiness.worker?worker";

let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) worker = new ReadinessWorker();
  return worker;
}

function runProbe(request: WorkerProbeRequest): Promise<Record<string, unknown>> {
  const w = getWorker();
  return new Promise((resolve, reject) => {
    const onMessage = (ev: MessageEvent<WorkerProbeResponse>) => {
      if (ev.data.requestId !== request.requestId) return;
      w.removeEventListener("message", onMessage);
      if (!ev.data.ok) {
        reject(new Error(ev.data.error));
        return;
      }
      resolve(ev.data.probe);
    };
    w.addEventListener("message", onMessage);
    w.postMessage(request, [request.buffer]);
  });
}

export async function probeAudioFile(file: {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
}): Promise<AudioProbe> {
  const buffer = await file.arrayBuffer();
  const probe = await runProbe({
    type: "probe-audio",
    requestId: crypto.randomUUID(),
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    buffer,
  });
  return probe as unknown as AudioProbe;
}

export async function probeArtworkFile(file: {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
}): Promise<ArtworkProbe> {
  const buffer = await file.arrayBuffer();
  const probe = await runProbe({
    type: "probe-artwork",
    requestId: crypto.randomUUID(),
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    buffer,
  });
  return probe as unknown as ArtworkProbe;
}
