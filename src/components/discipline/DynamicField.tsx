import { Check, Plus, X } from "lucide-react";
import { cx } from "@/lib/utils";
import { resolveOptions, type Opt } from "@/lib/disciplineFields";
import type { DisciplineCategory, FieldDef } from "@/types";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none";

export function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={cx("flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium transition active:scale-95",
        on ? "bg-veil-500/30 text-white ring-1 ring-veil-400/50" : "bg-white/[0.04] text-white/55 hover:text-white/80")}>
      {on && <Check className="h-3 w-3" />}{label}
    </button>
  );
}

/** A single discipline-specific field, rendered from its schema definition. */
export function DynamicField({
  field, value, onChange, cats,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  cats: DisciplineCategory[];
}) {
  const opts = resolveOptions(field, cats);
  return (
    <div className="space-y-1.5">
      <label className="flex items-baseline gap-2 text-[12px] font-semibold text-white/70">
        {field.label}
        {field.hint && <span className="text-[11px] font-normal text-white/35">{field.hint}</span>}
      </label>
      {renderControl(field, value, onChange, opts)}
    </div>
  );
}

function renderControl(field: FieldDef, value: unknown, onChange: (v: unknown) => void, opts: Opt[]) {
  switch (field.type) {
    case "text":
      return <input className={inputCls} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "textarea":
      return <textarea rows={3} className={cx(inputCls, "resize-none")} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "number":
      return <input type="number" className={inputCls} value={(value as number) ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} />;
    case "select": {
      const v = value as string;
      return (
        <div className="flex flex-wrap gap-1.5">
          {opts.map((o) => <Chip key={o.id} label={o.label} on={v === o.id} onClick={() => onChange(v === o.id ? null : o.id)} />)}
        </div>
      );
    }
    case "multiselect":
    case "role_multiselect": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      const tog = (id: string) => onChange(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
      return <div className="flex flex-wrap gap-1.5">{opts.map((o) => <Chip key={o.id} label={o.label} on={arr.includes(o.id)} onClick={() => tog(o.id)} />)}</div>;
    }
    case "proficiency_list":
      return <ProficiencyList opts={opts} value={(value as Record<string, number>) ?? {}} onChange={onChange} />;
    case "repeater":
      return <Repeater value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} />;
    default:
      return null;
  }
}

const LEVELS = ["Beginner", "Intermediate", "Advanced", "Pro", "Expert"];

function ProficiencyList({ opts, value, onChange }: { opts: Opt[]; value: Record<string, number>; onChange: (v: unknown) => void }) {
  const set = (id: string, lvl: number | null) => {
    const next = { ...value };
    if (lvl === null) delete next[id]; else next[id] = lvl;
    onChange(next);
  };
  return (
    <div className="space-y-1.5">
      {opts.map((o) => {
        const active = value[o.id] != null;
        return (
          <div key={o.id} className={cx("flex items-center gap-2 rounded-xl border px-3 py-2 transition",
            active ? "border-veil-400/40 bg-veil-500/[0.08]" : "border-white/8 bg-white/[0.02]")}>
            <button type="button" onClick={() => set(o.id, active ? null : 3)}
              className={cx("flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-white", active ? "bg-veil-500" : "bg-white/10")}>
              {active && <Check className="h-3 w-3" />}
            </button>
            <span className="min-w-0 flex-1 truncate text-sm text-white/80">{o.label}</span>
            {active ? (
              <div className="flex items-center gap-1" title={LEVELS[(value[o.id] ?? 3) - 1]}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => set(o.id, n)}
                    aria-label={`${o.label} level ${n}`}
                    className={cx("h-2.5 w-5 rounded-full ring-1 ring-inset transition active:scale-95",
                      n <= (value[o.id] ?? 3) ? "bg-veil-400 ring-veil-300/50" : "bg-white/[0.08] ring-white/20 hover:bg-white/20")} />
                ))}
              </div>
            ) : (
              <span className="text-[11px] text-white/35">Tap to add</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Repeater({ value, onChange }: { value: string[]; onChange: (v: unknown) => void }) {
  return (
    <div className="space-y-1.5">
      {value.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input className={inputCls} value={item} placeholder="https:// or a short note"
            onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))} />
          <button type="button" aria-label="Remove" onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full glass active:scale-90"><X className="h-3.5 w-3.5" /></button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, ""])}
        className="flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/70 hover:text-white active:scale-95">
        <Plus className="h-3.5 w-3.5" /> Add item
      </button>
    </div>
  );
}
