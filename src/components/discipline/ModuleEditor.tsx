import { cx } from "@/lib/utils";
import { SEEKING_INTENTS, COLLAB_STYLES, AVAILABILITY } from "@/lib/disciplineFields";
import { Chip, DynamicField } from "@/components/discipline/DynamicField";
import type { DisciplineCategory, DisciplineModule, DisciplineSchema, SeekingIntent } from "@/types";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none";

/** The editor for one discipline module: shared core fields + schema fields. */
export function ModuleEditor({
  module, schema, cats, onChange,
}: {
  module: DisciplineModule;
  schema: DisciplineSchema | null;
  cats: DisciplineCategory[];
  onChange: (patch: Partial<DisciplineModule>) => void;
}) {
  const setAttr = (key: string, val: unknown) => onChange({ attrs: { ...module.attrs, [key]: val } });
  const portfolioUrls = module.portfolio.map((p) => p.url);

  return (
    <div className="space-y-5">
      <Field label="Headline" hint="One line — who you are in this discipline">
        <textarea rows={2} className={cx(inputCls, "resize-none")} value={module.headline ?? ""}
          maxLength={160} placeholder={`e.g. ${sampleHeadline(module.label)}`}
          onChange={(e) => onChange({ headline: e.target.value })} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Years of experience">
          <input type="number" min={0} max={80} className={inputCls} value={module.yearsExp ?? ""}
            placeholder="e.g. 5" onChange={(e) => onChange({ yearsExp: e.target.value === "" ? null : Number(e.target.value) })} />
        </Field>
        <Field label="Proficiency">
          <Dots value={module.skill ?? 0} onChange={(n) => onChange({ skill: n })} />
        </Field>
      </div>

      <Field label="What are you seeking here?">
        <div className="flex flex-wrap gap-1.5">
          {SEEKING_INTENTS.map((s) => {
            const on = module.seeking.includes(s.id);
            return <Chip key={s.id} label={s.label} on={on}
              onClick={() => onChange({ seeking: (on ? module.seeking.filter((x) => x !== s.id) : [...module.seeking, s.id]) as SeekingIntent[] })} />;
          })}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Collaboration style">
          <div className="flex flex-wrap gap-1.5">
            {COLLAB_STYLES.map((o) => <Chip key={o.id} label={o.label} on={module.collabStyle === o.id}
              onClick={() => onChange({ collabStyle: module.collabStyle === o.id ? null : o.id })} />)}
          </div>
        </Field>
        <Field label="Availability">
          <div className="flex flex-wrap gap-1.5">
            {AVAILABILITY.map((o) => <Chip key={o.id} label={o.label} on={module.availability === o.id}
              onClick={() => onChange({ availability: module.availability === o.id ? null : o.id })} />)}
          </div>
        </Field>
      </div>

      {/* Discipline-specific fields (schema-driven). wants_roles is handled here too. */}
      {(schema?.fields ?? []).map((f) => (
        <DynamicField key={f.key} field={f} cats={cats} value={module.attrs[f.key]} onChange={(v) => setAttr(f.key, v)} />
      ))}

      <Field label="Portfolio / work samples" hint="Links to your best work in this discipline">
        <PortfolioRepeater urls={portfolioUrls} onChange={(urls) => onChange({ portfolio: urls.map((u) => ({ url: u })) })} />
      </Field>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-baseline gap-2 text-[12px] font-semibold text-white/70">
        {label}{hint && <span className="text-[11px] font-normal text-white/35">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced", "Pro", "Expert"];

function Dots({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1.5 pt-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" aria-label={`Level ${n}`} onClick={() => onChange(n)}
          className={cx("h-3.5 w-8 rounded-full ring-1 ring-inset transition active:scale-95",
            n <= value ? "bg-veil-400 ring-veil-300/50" : "bg-white/[0.07] ring-white/20 hover:bg-white/20")} />
      ))}
      <span className="ml-1.5 text-[11px] text-white/45">{value ? SKILL_LEVELS[value - 1] : "Tap to set"}</span>
    </div>
  );
}

function PortfolioRepeater({ urls, onChange }: { urls: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-1.5">
      {urls.map((u, i) => (
        <div key={i} className="flex items-center gap-2">
          <input className={inputCls} value={u} placeholder="https://…"
            onChange={(e) => onChange(urls.map((x, j) => (j === i ? e.target.value : x)))} />
          <button type="button" aria-label="Remove" onClick={() => onChange(urls.filter((_, j) => j !== i))}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full glass active:scale-90 text-white/70">✕</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...urls, ""])}
        className="rounded-full bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/70 hover:text-white active:scale-95">+ Add link</button>
    </div>
  );
}

function sampleHeadline(label: string) {
  return `${label} obsessed with texture & collaboration`;
}
