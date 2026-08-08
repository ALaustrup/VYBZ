import { useCallback, useRef, useState } from "react";
import { Loader2, Upload, FileArchive, Music } from "lucide-react";
import { cx } from "@/lib/utils";

type Kind = "preview" | "zip";

interface PackUploaderProps {
  kind: Kind;
  label: string;
  hint: string;
  accept: string;
  disabled?: boolean;
  currentName?: string | null;
  onUpload: (file: File) => Promise<void>;
}

export function PackUploader({
  kind,
  label,
  hint,
  accept,
  disabled,
  currentName,
  onUpload,
}: PackUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (file: File | undefined) => {
    if (!file || disabled) return;
    setError(null);
    setBusy(true);
    try {
      await onUpload(file);
    } catch (e) {
      setError((e as Error).message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }, [disabled, onUpload]);

  const Icon = kind === "zip" ? FileArchive : Music;

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wide text-white/45">{label}</div>
      <button
        type="button"
        data-no-library-drop
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
          void run(e.dataTransfer.files?.[0]);
        }}
        className={cx(
          "flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-6 text-center transition",
          dragging ? "border-veil-300/60 bg-veil-300/10" : "border-white/15 bg-white/[0.03] hover:border-white/25",
          (disabled || busy) && "opacity-60",
        )}
      >
        {busy ? (
          <Loader2 className="h-6 w-6 animate-spin text-veil-300" />
        ) : (
          <Icon className="h-6 w-6 text-veil-300" />
        )}
        <div className="text-sm text-white/80">
          {currentName ? <span className="font-medium">{currentName}</span> : (
            <>
              <Upload className="mr-1 inline h-3.5 w-3.5" />
              Drop or browse
            </>
          )}
        </div>
        <div className="text-xs text-white/40">{hint}</div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled || busy}
        onChange={(e) => {
          void run(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}
