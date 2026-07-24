import { AudioLines, FileAudio2, Layers } from "lucide-react";
import type { RepoPackAnalysis } from "@/lib/repoSync";

/** Honest cross-DAW handoff cues — never claims bit-perfect session merge. */
export function RepoExportHints({ pack }: { pack: RepoPackAnalysis }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-[11px]">
        <Badge
          ok={pack.hasDawproject}
          icon={<Layers className="h-3 w-3" />}
          label={pack.hasDawproject ? "DAWproject" : "No DAWproject"}
        />
        <Badge
          ok={pack.hasStemPack}
          icon={<AudioLines className="h-3 w-3" />}
          label={pack.hasStemPack ? `Stems · ${pack.stemPaths.length}` : "No stem pack"}
        />
        <Badge
          ok={pack.hasBounce}
          icon={<FileAudio2 className="h-3 w-3" />}
          label={pack.hasBounce ? `Bounce · ${pack.bouncePaths.length}` : "No bounce"}
        />
      </div>
      <p className="text-[11px] leading-relaxed text-white/40">
        Cross-DAW handoff is best-effort. Structure diffs and stem packs are first-class; we never merge opaque DAW sessions.
      </p>
      <ul className="space-y-1.5 text-[12px] leading-relaxed text-white/55">
        {pack.exportHints.slice(0, 4).map((h) => (
          <li key={h.slice(0, 48)} className="border-l border-white/10 pl-2.5">
            {h}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Badge({
  ok,
  icon,
  label,
}: {
  ok: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-lg px-2 py-1 " +
        (ok ? "bg-feel/12 text-feel" : "bg-white/[0.04] text-white/40")
      }
    >
      {icon}
      {label}
    </span>
  );
}
