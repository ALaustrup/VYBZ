/** First-slice bounds. Small-Music can do 120s; this machine starts shorter. */
export const GENERATE_MIN_SECONDS = 4;
export const GENERATE_MAX_SECONDS = 30;
export const GENERATE_DEFAULT_SECONDS = 15;
export const GENERATE_PROMPT_MAX = 500;
export const GENERATE_MODEL = "small-music" as const;
export const GENERATE_WORKER_URL = "http://127.0.0.1:48481";
export const GENERATE_WORKER_TIMEOUT_MS = 10 * 60 * 1000;

export function clampGenerateDuration(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return GENERATE_DEFAULT_SECONDS;
  return Math.min(GENERATE_MAX_SECONDS, Math.max(GENERATE_MIN_SECONDS, Math.round(n)));
}

export function clampGeneratePrompt(raw: unknown): string {
  return String(raw ?? "").trim().slice(0, GENERATE_PROMPT_MAX);
}

export function titleFromPrompt(prompt: string): string {
  const one = prompt.replace(/\s+/g, " ").trim();
  if (!one) return "Generated";
  return one.slice(0, 80);
}

export function generationDisclosure(input: {
  prompt: string;
  model: string;
  seed: number;
}): string {
  return `Generated with Stable Audio 3 (${input.model}). Prompt (declared): ${input.prompt}. Seed ${input.seed}.`;
}
