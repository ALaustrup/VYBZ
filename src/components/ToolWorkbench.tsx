import type { ReactNode } from "react";
import { Loader2, Upload } from "lucide-react";
import { ForgeAtmosphere, type ForgeAtmosphereIntensity } from "@/components/ForgeAtmosphere";
import { NexusPageHeader } from "@/components/NexusPageHeader";
import { cx } from "@/lib/utils";

type ToolWorkbenchProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  testId: string;
  atmosphere?: ForgeAtmosphereIntensity;
  wave?: boolean;
  /** Wider stage for piano roll / dense editors (Midi Maker). */
  wide?: boolean;
  children: ReactNode;
};

/** Shared dense tool canvas — atmosphere + Nexus header + stage slot. */
export function ToolWorkbench({
  eyebrow,
  title,
  subtitle,
  testId,
  atmosphere = "subtle",
  wave = true,
  wide = false,
  children,
}: ToolWorkbenchProps) {
  return (
    <div
      className={cx(
        "relative mx-auto w-full px-4 py-4 pb-28",
        wide ? "max-w-4xl" : "max-w-3xl",
      )}
      data-testid={testId}
    >
      <div className="pointer-events-none absolute inset-x-0 -top-4 bottom-0 -z-0 overflow-hidden rounded-[1.5rem]">
        <ForgeAtmosphere intensity={atmosphere} wave={wave} />
      </div>
      <div className="relative z-[1] flex flex-col gap-6">
        <NexusPageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
        {children}
      </div>
    </div>
  );
}

type ForgeDropzoneProps = {
  label: string;
  hint?: string;
  accept: string;
  multiple?: boolean;
  busy?: boolean;
  inputTestId?: string;
  onFiles: (files: FileList | null) => void;
  className?: string;
};

/** Analyzer-style forge glass drop target for tool pages. */
export function ForgeDropzone({
  label,
  hint = "or click to choose",
  accept,
  multiple,
  busy,
  inputTestId,
  onFiles,
  className,
}: ForgeDropzoneProps) {
  return (
    <label
      className={cx(
        "forge-glass forge-plasma relative flex cursor-pointer flex-col items-center justify-center gap-3 px-6 py-12 text-center transition hover:border-white/25",
        busy && "pointer-events-none opacity-70",
        className,
      )}
    >
      <span className="forge-glass-edge pointer-events-none" aria-hidden />
      {busy ? (
        <Loader2 className="relative z-[1] h-8 w-8 animate-spin text-[rgb(var(--app-accent-rgb))]" />
      ) : (
        <Upload className="relative z-[1] h-8 w-8 text-[rgb(var(--app-accent-rgb))]" />
      )}
      <div className="relative z-[1]">
        <p className="font-display text-lg font-semibold text-white">{label}</p>
        <p className="mt-1 text-sm text-white/50">{hint}</p>
      </div>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        data-testid={inputTestId}
        disabled={busy}
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );
}

export function ForgeEmptyWorkingSet({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="forge-glass forge-plasma relative flex flex-col items-center gap-2 !rounded-2xl px-6 py-10 text-center">
      <span className="forge-glass-edge pointer-events-none" aria-hidden />
      <p className="relative z-[1] font-display text-base font-semibold text-white/85">{title}</p>
      <p className="relative z-[1] max-w-sm text-sm text-white/45">{detail}</p>
    </div>
  );
}

export function ForgeMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="forge-metric">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function ForgeChip({
  active,
  onClick,
  children,
  testId,
  pressed,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  testId?: string;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={pressed ?? active}
      onClick={onClick}
      className={cx("forge-chip", active && "forge-chip--active")}
    >
      {children}
    </button>
  );
}
