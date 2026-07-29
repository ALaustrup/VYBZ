import { analyzeWavBuffer, PORTABLE_FFT_MAX_BYTES, type PortableAudioAnalysis } from "@vybz/processing/waveform";
import type { ProcessingWorkerRequest, ProcessingWorkerResponse } from "./processing.worker";
import ProcessingWorker from "./processing.worker?worker";

let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) worker = new ProcessingWorker();
  return worker;
}

/** Run portable WAV analysis in a Worker when available; sync fallback for tests/SSR. */
export async function portableAnalyzeWav(
  file: { name: string; sizeBytes: number; arrayBuffer: () => Promise<ArrayBuffer> },
  opts?: { bucketCount?: number }
): Promise<PortableAudioAnalysis> {
  if (file.sizeBytes > PORTABLE_FFT_MAX_BYTES) {
    throw new Error(`Portable FFT limited to ${PORTABLE_FFT_MAX_BYTES} bytes (got ${file.sizeBytes})`);
  }
  const buffer = await file.arrayBuffer();

  if (typeof Worker === "undefined") {
    return analyzeWavBuffer(buffer, {
      bucketCount: opts?.bucketCount ?? 800,
      includeSpectrum: true,
      sizeBytes: file.sizeBytes,
      engine: "portable",
    });
  }

  const w = getWorker();
  const requestId = crypto.randomUUID();
  const request: ProcessingWorkerRequest = {
    type: "analyze-wav",
    requestId,
    fileName: file.name,
    sizeBytes: file.sizeBytes,
    buffer,
    bucketCount: opts?.bucketCount ?? 800,
  };

  return new Promise((resolve, reject) => {
    const onMessage = (ev: MessageEvent<ProcessingWorkerResponse>) => {
      if (ev.data.requestId !== requestId) return;
      w.removeEventListener("message", onMessage);
      if (!ev.data.ok) {
        reject(new Error(ev.data.error));
        return;
      }
      resolve(ev.data.result as unknown as PortableAudioAnalysis);
    };
    w.addEventListener("message", onMessage);
    w.postMessage(request, [buffer]);
  });
}
