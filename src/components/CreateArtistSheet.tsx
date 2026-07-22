import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Loader2, Music2, X } from "lucide-react";
import * as api from "@/lib/api";
import { GENRES } from "@/lib/profileFields";
import { cx } from "@/lib/utils";
import type { Drop } from "@/types";

interface CreateArtistSheetProps {
  open: boolean;
  onClose: () => void;
  drops: Drop[];
  onCreated: (slug: string) => void;
  showToast: (msg: string) => void;
}

export function CreateArtistSheet({ open, onClose, drops, onCreated, showToast }: CreateArtistSheetProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [bio, setBio] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [slugOk, setSlugOk] = useState<boolean | null>(null);

  const eligible = useMemo(() => {
    const n = name.trim().toLowerCase();
    if (!n) return [];
    return drops.filter((d) => (d.creditedArtist ?? "").trim().toLowerCase() === n);
  }, [drops, name]);

  useEffect(() => {
    if (!open) return;
    setName(""); setSlug(""); setSlugTouched(false); setBio(""); setGenres([]);
    setSelected([]); setBusy(false); setSlugOk(null);
  }, [open]);

  useEffect(() => {
    if (!slugTouched) setSlug(api.normalizeArtistSlug(name));
  }, [name, slugTouched]);

  useEffect(() => {
    const s = api.normalizeArtistSlug(slug);
    if (s.length < 2) { setSlugOk(null); return; }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void api.artistSlugAvailable(s).then((ok) => { if (!cancelled) setSlugOk(ok); });
    }, 280);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [slug]);

  useEffect(() => {
    setSelected((prev) => prev.filter((id) => eligible.some((d) => d.id === id)));
  }, [eligible]);

  function toggleGenre(g: string) {
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : prev.length >= 5 ? prev : [...prev, g]));
  }

  function toggleDrop(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit() {
    if (busy) return;
    if (selected.length < 2) {
      showToast("Select at least 2 drops tagged with this artist name.");
      return;
    }
    setBusy(true);
    const res = await api.createArtistProfile({
      slug, displayName: name.trim(), bio: bio.trim() || undefined, genres, dropIds: selected,
    });
    setBusy(false);
    if (!res.artist) { showToast(res.error || "Couldn't create artist profile."); return; }
    showToast(`@${res.artist.slug} is live`);
    onCreated(res.artist.slug);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-[55] bg-black/75 backdrop-blur-sm" />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[55] mx-auto flex max-h-[94dvh] w-full max-w-lg flex-col rounded-t-3xl border-t border-white/10 bg-ink-900/95 shadow-card backdrop-blur-2xl">
            <div className="mx-auto mt-3 h-1.5 w-11 rounded-full bg-white/20" />
            <div className="flex shrink-0 items-center justify-between px-5 py-3">
              <div>
                <h2 className="font-display text-xl font-semibold tracking-tight text-white">Official artist</h2>
                <p className="text-[12px] text-white/40">Linked to your account · needs 2 tagged drops</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"><X className="h-4 w-4" /></button>
            </div>
            <div className="mx-5 h-px bg-[var(--hairline)]" />

            <div className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-white/60">Artist / band name</label>
                <input value={name} onChange={(e) => setName(e.target.value.slice(0, 80))}
                  placeholder="Exactly as tagged on your drops"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-[15px] text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-white/60">URL slug</label>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
                  <span className="text-[13px] text-white/35">/artist/</span>
                  <input value={slug} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40)); }}
                    className="min-w-0 flex-1 bg-transparent text-[15px] text-white focus:outline-none" />
                  {slugOk === true && <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-300" />}
                  {slugOk === false && <span className="shrink-0 text-[11px] text-wild">Taken</span>}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-white/60">Bio (optional)</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 400))} rows={3}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
              </div>
              <div>
                <p className="mb-1.5 text-[12px] font-semibold text-white/60">Genres</p>
                <div className="flex flex-wrap gap-1.5">
                  {GENRES.slice(0, 18).map((g) => (
                    <button key={g} type="button" onClick={() => toggleGenre(g)}
                      className={cx("rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                        genres.includes(g) ? "bg-veil-500/30 text-white ring-1 ring-veil-400/50" : "bg-white/[0.05] text-white/55")}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[12px] font-semibold text-white/60">
                  Ownership evidence · {selected.length}/2+ selected
                </p>
                {!name.trim() ? (
                  <p className="text-[12px] text-white/40">Enter the artist name to find matching tagged drops.</p>
                ) : eligible.length < 2 ? (
                  <p className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-[12px] text-white/50">
                    Need ≥2 drops credited as “{name.trim()}”. Tag them in New Drop → Credited artist, then come back.
                    {eligible.length === 1 ? " (1 match so far.)" : ""}
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {eligible.map((d) => (
                      <li key={d.id}>
                        <button type="button" onClick={() => toggleDrop(d.id)}
                          className={cx(
                            "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                            selected.includes(d.id)
                              ? "border-veil-400/50 bg-veil-500/15"
                              : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]",
                          )}>
                          <Music2 className="h-4 w-4 shrink-0 text-veil-200" />
                          <span className="min-w-0 flex-1 truncate text-[13px] text-white/85">{d.title || "Untitled"}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="shrink-0 border-t border-[var(--hairline)] px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button type="button" onClick={submit}
                disabled={busy || selected.length < 2 || slugOk === false || !api.normalizeArtistSlug(slug)}
                className="btn btn-primary w-full py-3.5 disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create official artist"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
