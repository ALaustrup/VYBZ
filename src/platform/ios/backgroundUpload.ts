/**
 * iOS background upload bridge — URLSession via Cap plugin VybzBackgroundUpload.
 * Shared TS uploadQueue remains source of truth; this schedules native transfers.
 */

import { Capacitor, registerPlugin } from "@capacitor/core";

type BackgroundUploadPlugin = {
  enqueue(options: {
    id: string;
    url: string;
    filePath: string;
    method?: string;
    contentType?: string;
  }): Promise<{ id: string; state: string }>;
  cancel(options: { id: string }): Promise<{ id: string; state: string }>;
  status(options: { id: string }): Promise<{ id: string; state: string }>;
};

const NativeBg = registerPlugin<BackgroundUploadPlugin>("VybzBackgroundUpload");

export function isIosBackgroundUploadAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export async function enqueueIosBackgroundUpload(opts: {
  id: string;
  url: string;
  filePath: string;
  method?: string;
  contentType?: string;
}): Promise<{ id: string; state: string } | null> {
  if (!isIosBackgroundUploadAvailable()) return null;
  try {
    return await NativeBg.enqueue(opts);
  } catch {
    return null;
  }
}

export async function cancelIosBackgroundUpload(id: string): Promise<void> {
  if (!isIosBackgroundUploadAvailable()) return;
  try {
    await NativeBg.cancel({ id });
  } catch {
    /* ignore */
  }
}
