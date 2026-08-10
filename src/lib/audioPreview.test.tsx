import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

const audioBusMocks = vi.hoisted(() => ({
  getSnapshot: vi.fn(),
  stop: vi.fn(),
}));

vi.mock("@/lib/audioBus", () => audioBusMocks);

import {
  stopAudioPreview,
  useAudioPreviewUrlCleanup,
} from "@/lib/audioPreview";

function CleanupHarness({ url }: { url: string | null }) {
  useAudioPreviewUrlCleanup(url, "translation-preview:");
  return null;
}

beforeEach(() => {
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(URL, "revokeObjectURL");
  audioBusMocks.getSnapshot.mockReset();
  audioBusMocks.stop.mockReset();
});

describe("AudioBus preview URL ownership", () => {
  it("revokes page URLs without stopping unrelated catalog playback", () => {
    const revoke = vi.mocked(URL.revokeObjectURL);
    audioBusMocks.getSnapshot.mockReturnValue({
      track: { id: "catalog:track", url: "https://example.test/track.mp3" },
    });

    const view = render(<CleanupHarness url="blob:translation-a" />);
    view.rerender(<CleanupHarness url="blob:translation-b" />);

    expect(revoke).toHaveBeenCalledWith("blob:translation-a");
    expect(audioBusMocks.stop).not.toHaveBeenCalled();
  });

  it("stops a matching owned preview before revoking its active URL", () => {
    audioBusMocks.getSnapshot.mockReturnValue({
      track: {
        id: "translation-preview:phone:blob:translation-a",
        url: "blob:translation-a",
      },
    });

    const view = render(<CleanupHarness url="blob:translation-a" />);
    view.rerender(<CleanupHarness url="blob:translation-b" />);

    expect(audioBusMocks.stop).toHaveBeenCalledOnce();
  });

  it("stops only playback owned by the requested preview surface", () => {
    audioBusMocks.getSnapshot.mockReturnValue({
      track: { id: "correct-preview:a:matched:blob:a", url: "blob:a" },
    });
    stopAudioPreview("translation-preview:");
    expect(audioBusMocks.stop).not.toHaveBeenCalled();

    stopAudioPreview("correct-preview:");
    expect(audioBusMocks.stop).toHaveBeenCalledOnce();
  });
});
