import type { GenerateAudioRequest, GenerateAudioResult, SelectedFile } from "@/contracts";
import { PlatformError } from "@/platform/bridge/errors";
import {
  GENERATE_MODEL,
  GENERATE_WORKER_TIMEOUT_MS,
  GENERATE_WORKER_URL,
  clampGenerateDuration,
  clampGeneratePrompt,
} from "./generateRequest";

function newId(): string {
  return crypto.randomUUID();
}

export async function requestLocalGenerate(
  input: GenerateAudioRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<GenerateAudioResult> {
  const prompt = clampGeneratePrompt(input.prompt);
  if (!prompt) {
    throw new PlatformError("validation", "Write a prompt first.");
  }
  const durationSec = clampGenerateDuration(input.durationSec);
  const seed = Number.isFinite(input.seed) && (input.seed as number) >= 0
    ? Math.floor(input.seed as number)
    : Math.floor(Math.random() * 1e9);
  const model = input.model ?? GENERATE_MODEL;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), GENERATE_WORKER_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetchImpl(`${GENERATE_WORKER_URL}/v1/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, durationSec, seed, model }),
      signal: ctrl.signal,
    });
  } catch (err) {
    throw new PlatformError(
      "unsupported",
      "Generate is not available here. Start the local worker (npm run generate:worker).",
      err,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let detail = `Worker returned ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) detail = body.error;
    } catch {
      /* keep status */
    }
    throw new PlatformError(res.status === 503 ? "unsupported" : "io", detail);
  }

  const blob = await res.blob();
  if (!blob.size) {
    throw new PlatformError("io", "Worker returned an empty file.");
  }
  const name = `generated-${seed}.wav`;
  const file = new File([blob], name, { type: "audio/wav" });
  const selected: SelectedFile = {
    id: newId(),
    name,
    mimeType: "audio/wav",
    sizeBytes: file.size,
    blob: file,
    lastModified: Date.now(),
  };
  return { file: selected, model, prompt, durationSec, seed };
}

export async function probeGenerateWorker(
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const res = await fetchImpl(`${GENERATE_WORKER_URL}/v1/health`);
    return res.ok;
  } catch {
    return false;
  }
}
