import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Layers, Loader2 } from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { DisciplineTabs } from "@/components/discipline/DisciplineTabs";
import { AddDisciplineModal } from "@/components/discipline/AddDisciplineModal";
import { ModuleEditor } from "@/components/discipline/ModuleEditor";
import type { DisciplineCategory, DisciplineModule, DisciplineSchema, ModuleInput } from "@/types";

function toInput(m: DisciplineModule): ModuleInput {
  return {
    id: m.id.startsWith("tmp-") ? undefined : m.id,
    roleId: m.roleId, headline: m.headline, yearsExp: m.yearsExp,
    collabStyle: m.collabStyle, availability: m.availability, seeking: m.seeking,
    skill: m.skill, attrs: m.attrs, portfolio: m.portfolio,
  };
}

export function DisciplinesPage() {
  const navigate = useNavigate();
  const { showToast } = useSession();
  const [cats, setCats] = useState<DisciplineCategory[]>([]);
  const [modules, setModules] = useState<DisciplineModule[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [schemas, setSchemas] = useState<Record<string, DisciplineSchema | null>>({});
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [confirm, setConfirm] = useState<DisciplineModule | null>(null);
  const [saved, setSaved] = useState<"idle" | "saving" | "done">("idle");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    Promise.all([api.listDisciplines(), api.myModules()]).then(([c, m]) => {
      setCats(c); setModules(m); setActiveId(m[0]?.id ?? null); setLoading(false);
    });
  }, []);

  const active = useMemo(() => modules.find((m) => m.id === activeId) ?? null, [modules, activeId]);

  // Lazily load the active discipline's field schema.
  useEffect(() => {
    if (!active || active.roleId in schemas) return;
    api.disciplineSchema(active.roleId).then((s) => setSchemas((prev) => ({ ...prev, [active.roleId]: s })));
  }, [active, schemas]);

  const scheduleSave = useCallback((m: DisciplineModule) => {
    setSaved("saving");
    clearTimeout(timers.current[m.id]);
    timers.current[m.id] = setTimeout(async () => {
      try {
        const id = await api.upsertModule(toInput(m));
        setModules((prev) => prev.map((x) => (x.id === m.id ? { ...x, id } : x)));
        setSaved("done");
        setTimeout(() => setSaved("idle"), 1200);
      } catch { showToast("Couldn't save — retrying on next edit."); setSaved("idle"); }
    }, 700);
  }, [showToast]);

  const patchActive = useCallback((patch: Partial<DisciplineModule>) => {
    setModules((prev) => {
      const next = prev.map((m) => (m.id === activeId ? { ...m, ...patch } : m));
      const edited = next.find((m) => m.id === activeId);
      if (edited) scheduleSave(edited);
      return next;
    });
  }, [activeId, scheduleSave]);

  async function addDiscipline(roleId: string) {
    setAddOpen(false);
    if (modules.some((m) => m.roleId === roleId)) {
      setActiveId(modules.find((m) => m.roleId === roleId)!.id);
      return;
    }
    const label = cats.flatMap((c) => c.disciplines).find((d) => d.id === roleId)?.label ?? roleId;
    const category = cats.find((c) => c.disciplines.some((d) => d.id === roleId))?.id ?? null;
    const tmp: DisciplineModule = {
      id: `tmp-${roleId}`, roleId, category, label, headline: null, yearsExp: null,
      collabStyle: null, availability: null, seeking: [], skill: null, attrs: {}, portfolio: [],
      sort: modules.length,
    };
    setModules((prev) => [...prev, tmp]);
    setActiveId(tmp.id);
    try {
      const id = await api.upsertModule(toInput(tmp));
      setModules((prev) => prev.map((m) => (m.id === tmp.id ? { ...m, id } : m)));
      setActiveId((cur) => (cur === tmp.id ? id : cur));
      showToast(`Added ${label}`);
    } catch { showToast("Couldn't add that discipline."); setModules((prev) => prev.filter((m) => m.id !== tmp.id)); }
  }

  async function removeDiscipline(m: DisciplineModule) {
    setConfirm(null);
    setModules((prev) => prev.filter((x) => x.id !== m.id));
    setActiveId((cur) => (cur === m.id ? (modules.find((x) => x.id !== m.id)?.id ?? null) : cur));
    if (!m.id.startsWith("tmp-")) {
      try { await api.archiveModule(m.id); showToast(`Removed ${m.label}`); }
      catch { showToast("Couldn't remove — refresh and try again."); }
    }
  }

  const existing = modules.map((m) => m.roleId);
  const suggestions = useMemo(() => {
    const myCats = new Set(modules.map((m) => m.category));
    return cats.filter((c) => myCats.has(c.id)).flatMap((c) => c.disciplines.map((d) => d.id)).filter((id) => !existing.includes(id));
  }, [cats, modules, existing]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 pb-1 pt-3 max-lg:pr-14">
        <button onClick={() => navigate("/profile")} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-bold text-gradient">Discipline modules</h1>
          <p className="text-[12px] text-white/45">The creative hats you wear — each one sharpens your matches.</p>
        </div>
        {saved !== "idle" && (
          <span className="flex items-center gap-1 text-[11px] text-white/45">
            {saved === "saving" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-feel" />}
            {saved === "saving" ? "Saving" : "Saved"}
          </span>
        )}
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-10 pt-3">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-veil-300" /></div>
        ) : (
          <>
            <DisciplineTabs modules={modules} activeId={activeId}
              onSelect={setActiveId} onRemove={(id) => setConfirm(modules.find((m) => m.id === id) ?? null)} onAdd={() => setAddOpen(true)} />

            <div className="mt-5">
              {active ? (
                <ModuleEditor module={active} schema={schemas[active.roleId] ?? null} cats={cats} onChange={patchActive} />
              ) : (
                <button onClick={() => setAddOpen(true)}
                  className="flex w-full flex-col items-center gap-3 rounded-3xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-14 text-center transition hover:border-veil-400/50 active:scale-[0.99]">
                  <Layers className="h-8 w-8 text-veil-300" />
                  <div>
                    <p className="font-display text-lg font-semibold text-white">What creative hats do you wear?</p>
                    <p className="mt-1 text-sm text-white/50">Add your first discipline to start building a profile that finds your people.</p>
                  </div>
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <AddDisciplineModal open={addOpen} categories={cats} existing={existing} suggestions={suggestions}
        onPick={addDiscipline} onClose={() => setAddOpen(false)} />

      {confirm && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-6" role="dialog">
          <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={() => setConfirm(null)} />
          <div className="glass-panel relative z-10 w-full max-w-xs rounded-3xl p-5 text-center">
            <p className="font-display text-lg font-semibold text-white">Remove {confirm.label}?</p>
            <p className="mt-1 text-sm text-white/55">This module is archived — your history is kept if you add it back later.</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setConfirm(null)} className="flex-1 rounded-xl bg-white/[0.06] py-2.5 text-sm font-semibold text-white/80 active:scale-95">Keep</button>
              <button onClick={() => removeDiscipline(confirm)} className="flex-1 rounded-xl bg-wild/90 py-2.5 text-sm font-semibold text-white active:scale-95">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
