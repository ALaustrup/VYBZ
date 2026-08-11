/**
 * Analyzer intake helpers — replace the retired prepare-new-release form flow.
 */
import { expect, type Page } from "@playwright/test";

/** Minimal PCM WAV (mono 44.1 kHz) for probe + scan. */
export function buildFixtureWavBuffer(seconds = 0.5): Buffer {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * seconds);
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.3 * 32767;
    buf.writeInt16LE(Math.trunc(sample), 44 + i * 2);
  }
  return buf;
}

async function dropWavOnAnalyzer(page: Page, fileName: string, buffer: Buffer) {
  await page.getByTestId("analyzer-dropzone").evaluate(
    (dz, payload) => {
      const bin = atob(payload.b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const file = new File([bytes], payload.name, { type: "audio/wav" });
      const dt = new DataTransfer();
      dt.items.add(file);
      const fire = (type: string) => {
        const event = new Event(type, { bubbles: true, cancelable: true });
        Object.defineProperty(event, "dataTransfer", { value: dt });
        dz.dispatchEvent(event);
      };
      fire("dragenter");
      fire("dragover");
      fire("drop");
    },
    { name: fileName, b64: buffer.toString("base64") },
  );
}

/** Scan one fixture track; returns the created release id. */
export async function scanViaAnalyzer(page: Page, fileName: string): Promise<string> {
  const buffer = buildFixtureWavBuffer(0.5);
  await page.goto("/releases");
  await expect(page.getByTestId("prepare-releases")).toBeVisible();
  await expect(page.getByTestId("analyzer-dropzone")).toBeVisible();

  const done = page.locator('[data-testid="analyzer-triage-row"][data-phase="done"]').first();
  for (let attempt = 1; attempt <= 3; attempt++) {
    await dropWavOnAnalyzer(page, fileName, buffer);
    try {
      await expect(done).toHaveAttribute("data-release-id", /.+/, { timeout: attempt === 3 ? 90_000 : 25_000 });
      break;
    } catch (err) {
      if (attempt === 3) throw err;
      await page.reload();
      await expect(page.getByTestId("analyzer-dropzone")).toBeVisible();
    }
  }

  const releaseId = await done.getAttribute("data-release-id");
  expect(releaseId, "scanned row should expose release id").toBeTruthy();
  return releaseId!;
}

export async function openScannedRelease(page: Page, releaseId: string) {
  // Avoid hovering triage rows — fine-pointer preview decode can stall Chromium.
  await page.goto(`/release/${releaseId}`);
  await expect(page.getByTestId("prepare-detail")).toBeVisible({ timeout: 30_000 });
}
