import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import * as api from "@/lib/api";
import type { PackCopyResult } from "./types";

interface PackCopyPanelProps {
  keywords: string;
  genre: string;
  disabled?: boolean;
  onGenerated: (copy: PackCopyResult) => void;
  onError?: (message: string) => void;
}

export function PackCopyPanel({
  keywords,
  genre,
  disabled,
  onGenerated,
  onError,
}: PackCopyPanelProps) {
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (disabled || busy) return;
    const kw = keywords.trim();
    if (kw.length < 3) {
      onError?.("Add a few words first.");
      return;
    }
    setBusy(true);
    try {
      const copy = await api.generateStorefrontPackCopy(kw, genre || undefined);
      if (!copy) {
        onError?.("AI is down. Write it yourself.");
        return;
      }
      onGenerated(copy);
    } catch (e) {
      onError?.((e as Error).message || "AI failed. Write it yourself.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={() => void generate()}
      className="btn btn-ghost inline-flex items-center gap-2 px-3 py-1.5 text-xs"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-veil-300" />}
      Write with AI
    </button>
  );
}
