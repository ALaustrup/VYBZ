import { useEffect, useState, type MutableRefObject } from "react";
import { Check, Loader2 } from "lucide-react";
import * as api from "@/lib/api";
import { DAWS, GENRES, ROLES, SOFTWARE, STYLES, ENGINES } from "@/lib/profileFields";
import { cx } from "@/lib/utils";
import type { DisciplineSchema, FieldDef } from "@/types";

function resolveOptions(field: FieldDef): string[] {
  if (Array.isArray(field.options)) return field.options;
  if (field.options === "genres") return [...GENRES];
  if (field.options === "daws") return DAWS.map((d) => d.id);
  if (field.options === "software") return [...SOFTWARE];
  if (field.options === "styles") return [...STYLES];
  if (field.options === "engines") return [...ENGINES];
  if (typeof field.options === "string" && field.options.startsWith("roles:")) {
    return ROLES.map((r) => r.id);
  }
  // Fallback: key-named catalogs used by Discover facets.
  if (field.key === "software" && !field.options) return [...SOFTWARE];
  if (field.key === "styles" && !field.options) return [...STYLES];
  if (field.key === "engines" && !field.options) return [...ENGINES];
  return [];
}

function asStringList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      if (typeof x === "string") return x;
      if (typeof x === "object" && x && "name" in x) return String((x as { name: string }).name);
      return null;
    })
    .filter(Boolean) as string[];
}

type Row = {
  roleId: string;
  label: string;
  moduleId: string | null;
  schema: DisciplineSchema;
  attrs: Record<string, string[]>;
};

/**
 * Schema-driven discipline attrs editor for offered roles that have a
 * discipline_field_schemas entry. Saves via upsertModule (string-array attrs).
 */
export function ModuleAttrsEditor({
  offerRoleIds,
  saveRef,
}: {
  offerRoleIds: string[];
  saveRef: MutableRefObject<(() => Promise<void>) | null>;
}) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const modules = await api.myModules();
        const byRole = new Map(modules.map((m) => [m.roleId, m]));
        const next: Row[] = [];
        for (const roleId of offerRoleIds) {
          const schema = await api.disciplineSchema(roleId);
          if (!schema?.fields?.length) continue;
          const editable = schema.fields.filter((f) =>
            f.type === "multiselect" || f.type === "proficiency_list" || f.type === "select",
          );
          if (!editable.length) continue;
          const mod = byRole.get(roleId);
          const attrs: Record<string, string[]> = {};
          for (const f of editable) attrs[f.key] = asStringList(mod?.attrs?.[f.key]);
          next.push({
            roleId,
            label: mod?.label ?? ROLES.find((r) => r.id === roleId)?.label ?? roleId,
            moduleId: mod?.id ?? null,
            schema: { fields: editable },
            attrs,
          });
        }
        if (alive) setRows(next);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerRoleIds.join("|")]);

  useEffect(() => {
    saveRef.current = async () => {
      for (const row of rows) {
        await api.upsertModule({
          id: row.moduleId ?? undefined,
          roleId: row.roleId,
          attrs: row.attrs,
        });
      }
    };
    return () => { saveRef.current = null; };
  }, [rows, saveRef]);

  function toggle(roleId: string, key: string, value: string, max = 12) {
    setRows((list) => list.map((row) => {
      if (row.roleId !== roleId) return row;
      const cur = row.attrs[key] ?? [];
      const next = cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value].slice(0, max);
      return { ...row, attrs: { ...row.attrs, [key]: next } };
    }));
  }

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-veil-300" /></div>;
  }
  if (rows.length === 0) {
    return (
      <p className="text-[13px] text-white/40">
        Add an offered role with craft details (Illustrator, Video Editor, Game Designer, …) to edit software, styles, and engines.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {rows.map((row) => (
        <div key={row.roleId} className="space-y-3 border-b border-[var(--hairline)] pb-4 last:border-0">
          <p className="text-[13px] font-semibold text-white/80">{row.label}</p>
          {row.schema.fields.map((field) => {
            const opts = resolveOptions(field);
            const selected = row.attrs[field.key] ?? [];
            if (field.type === "select") {
              return (
                <div key={field.key} className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-white/35">{field.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {opts.map((opt) => (
                      <Chip
                        key={opt}
                        label={opt}
                        on={selected[0] === opt}
                        onClick={() => setRows((list) => list.map((r) =>
                          r.roleId === row.roleId
                            ? { ...r, attrs: { ...r.attrs, [field.key]: selected[0] === opt ? [] : [opt] } }
                            : r,
                        ))}
                      />
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <div key={field.key} className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wide text-white/35">{field.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {opts.map((opt) => (
                    <Chip
                      key={opt}
                      label={DAWS.find((d) => d.id === opt)?.label ?? opt}
                      on={selected.includes(opt)}
                      onClick={() => toggle(row.roleId, field.key, opt)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition active:scale-95",
        on ? "bg-veil-500/20 text-white ring-1 ring-veil-400/40" : "bg-white/[0.03] text-white/45 hover:text-white/70",
      )}
    >
      {on && <Check className="h-3 w-3" />}{label}
    </button>
  );
}
