import { useState } from "react";
import { Disc3, Plus, Upload } from "lucide-react";

/**
 * Upload-entry UI for inspection. Buttons only record intent — no network writes.
 */
export function AiReviewUploadSurface() {
  const [log, setLog] = useState<string[]>([]);

  function note(action: string) {
    setLog((prev) => [`${action} (no-op)`, ...prev].slice(0, 8));
  }

  return (
    <div className="space-y-6 py-6" data-testid="ai-review-upload">
      <header>
        <h1 className="font-display text-2xl font-semibold text-snow">Upload flow</h1>
        <p className="mt-1 max-w-prose text-sm text-fog">
          Mirrors app-bar compose / bulk entry. In AI review mode these actions do not upload or
          persist.
        </p>
      </header>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="forge-cta gap-2"
          onClick={() => note("new-track")}
        >
          <Upload className="h-4 w-4" /> New track
        </button>
        <button
          type="button"
          className="forge-cta-ghost gap-2"
          onClick={() => note("album-batch")}
        >
          <Disc3 className="h-4 w-4" /> Album / batch
        </button>
        <button
          type="button"
          className="forge-chip h-10 w-10"
          aria-label="Plus (compose)"
          onClick={() => note("compose-plus")}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
      <ul className="rounded-suite border border-[var(--hairline)] bg-white/[0.03] p-3 text-xs text-white/50">
        {log.length === 0 ? <li>No actions yet — click to inspect handlers.</li> : null}
        {log.map((line, i) => (
          <li key={`${line}-${i}`} data-testid="ai-review-upload-log">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
