import { useCallback, useEffect, useState } from "react";
import { Briefcase, Check, DollarSign, Inbox, Loader2, Plus, Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as api from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { NetworkModes } from "@/components/network/NetworkModes";
import { useSession } from "@/store/session";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { ROLES, GENRES } from "@/lib/profileFields";
import { cx } from "@/lib/utils";
import type { Opportunity } from "@/types";

type BrowseTab = "for_you" | "collab" | "commission" | "inbox";
type PostKind = "collab" | "commission";

export function OpportunitiesPage() {
  const { showToast } = useSession();
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [tab, setTab] = useState<BrowseTab>("for_you");
  const [pendingCount, setPendingCount] = useState(0);

  async function load(t: BrowseTab) {
    setLoading(true);
    if (t === "inbox") {
      setLoading(false);
      return;
    }
    if (t === "for_you") setItems(await api.myOpportunities(50));
    else setItems(await api.listOpportunities(50, t));
    setLoading(false);
  }
  useEffect(() => { void load(tab); }, [tab]);

  useEffect(() => {
    void api.myOpportunityInbox().then((rows) => {
      setPendingCount(rows.filter((r) => r.status === "pending").length);
    }).catch(() => undefined);
  }, [tab, composing]);

  useRegisterAppBar({
    actions: (
      <button type="button" onClick={() => setComposing(true)} className="btn btn-primary h-9 px-3.5 py-0 text-xs">
        <Plus className="h-3.5 w-3.5" /> Post
      </button>
    ),
  }, []);

  async function apply(o: Opportunity) {
    try {
      await api.applyToOpportunity(o.id);
      showToast(o.kind === "commission" ? "Pitched — the client can see you now." : "Applied — the poster can see you now.");
      setItems((prev) => prev.map((x) => (x.id === o.id ? { ...x, applied: true } : x)));
    } catch {
      showToast("Couldn't apply (maybe already applied).");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-1 pt-2">
        <NetworkModes />
        <div className="mb-1 flex gap-5 overflow-x-auto">
          {([
            { id: "for_you" as const, label: "For you", icon: Sparkles },
            { id: "collab" as const, label: "Open roles", icon: Briefcase },
            { id: "commission" as const, label: "Commissions", icon: DollarSign },
            { id: "inbox" as const, label: "Inbox", icon: Inbox },
          ]).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cx(
                "relative flex shrink-0 items-center gap-1 pb-2.5 text-[13px] font-medium transition",
                tab === t.id ? "text-white" : "text-white/40 hover:text-white/70",
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
              {t.id === "inbox" && pendingCount > 0 && (
                <span className="rounded-full bg-veil-500/30 px-1.5 text-[10px] font-bold text-veil-100">{pendingCount}</span>
              )}
              {tab === t.id && <span className="absolute inset-x-0 bottom-0 h-px bg-veil-400/70" />}
            </button>
          ))}
        </div>
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-1 pb-6 pt-2">
        {tab === "inbox" ? (
          <PosterInbox onPendingChange={setPendingCount} />
        ) : loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
        ) : items.length === 0 ? (
          tab === "for_you" ? (
            <EmptyState
              icon={Sparkles}
              title="Nothing ranked for you yet"
              body="Add the roles you offer on your profile. Openings that need those skills land here."
            />
          ) : tab === "commission" ? (
            <EmptyState icon={DollarSign} title="No paid gigs yet" body="Post a brief and a budget." />
          ) : (
            <EmptyState icon={Briefcase} title="No open roles yet" body="Post what you need — vocalist, mix, guitar." />
          )
        ) : (
          <div className="divide-y divide-[var(--hairline)]">
            {items.map((o) => (
              <div key={o.id} className="py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display font-semibold text-white">{o.title}</p>
                      {tab === "for_you" && o.fit > 0 && (
                        <span className="text-[11px] font-semibold text-veil-200">{Math.round(o.fit * 100)}% fit</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-white/40">
                      {o.kind === "commission" ? "Seeking" : "Needs"}{" "}
                      <span className="font-medium text-white/70">{o.roleLabel}</span>
                      {" · "}{o.authorUsername ?? "creator"}
                      {o.remoteOk ? " · remote ok" : ""}
                      {o.applied ? " · applied" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => apply(o)}
                    disabled={o.applied}
                    className="btn btn-primary h-8 shrink-0 px-3 py-0 text-xs disabled:opacity-50"
                  >
                    {o.applied ? "Applied" : o.kind === "commission" ? "Pitch" : "Apply"}
                  </button>
                </div>
                {o.kind === "commission" && o.budget && (
                  <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-200">
                    <DollarSign className="h-3 w-3" /> {o.budget}
                  </p>
                )}
                {o.body && <p className="mt-2 text-sm leading-snug text-white/70">{o.body}</p>}
                {(o.sharedGenres.length > 0 || o.genres.length > 0) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(tab === "for_you" && o.sharedGenres.length > 0 ? o.sharedGenres : o.genres)
                      .slice(0, 4)
                      .map((g) => (
                        <span key={g} className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/70">{g}</span>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {composing && (
        <PostForm
          initialKind={tab === "commission" ? "commission" : "collab"}
          onClose={() => setComposing(false)}
          onPosted={(k) => {
            setComposing(false);
            setTab(k);
            void load(k);
          }}
        />
      )}
    </div>
  );
}

function PosterInbox({ onPendingChange }: { onPendingChange: (n: number) => void }) {
  const { showToast } = useSession();
  const navigate = useNavigate();
  const [rows, setRows] = useState<api.OpportunityApplication[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const list = await api.myOpportunityInbox();
    setRows(list);
    onPendingChange(list.filter((r) => r.status === "pending").length);
  }, [onPendingChange]);

  useEffect(() => { void load(); }, [load]);

  async function respond(row: api.OpportunityApplication, accept: boolean) {
    const key = `${row.postId}:${row.applicantId}`;
    setBusy(key);
    try {
      const r = await api.respondOpportunityApplication(row.postId, row.applicantId, accept);
      showToast(accept ? "Accepted — DM opened" : "Declined");
      if (accept && r.threadId) navigate(`/messages/${r.threadId}`);
      await load();
    } catch (e) {
      showToast((e as Error).message || "Couldn't update application.");
    } finally {
      setBusy(null);
    }
  }

  async function markFilled(postId: string) {
    try {
      await api.closeOpportunity(postId, "filled");
      showToast("Marked filled");
      await load();
    } catch (e) {
      showToast((e as Error).message || "Couldn't update post.");
    }
  }

  if (rows === null) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>;
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No applications yet"
        body="When people apply or pitch your posts, they land here. Accept opens a free DM — never a paywall."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-white/40">
        Review pitches on your posts. Accept starts a free message thread.
      </p>
      {rows.map((row) => {
        const key = `${row.postId}:${row.applicantId}`;
        return (
          <div key={key} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-display font-semibold text-white">{row.postTitle}</p>
                <p className="mt-0.5 text-xs text-white/45">
                  {row.postKind === "commission" ? "Commission" : "Collab"} · @{row.applicantUsername ?? "creator"}
                  {" · "}{row.status}
                </p>
              </div>
              {row.status === "pending" && row.postStatus === "open" && (
                <button
                  type="button"
                  onClick={() => void markFilled(row.postId)}
                  className="shrink-0 text-[11px] font-semibold text-white/40 hover:text-white/70"
                >
                  Mark filled
                </button>
              )}
            </div>
            {row.message && <p className="mt-2 text-sm text-white/70">{row.message}</p>}
            {row.status === "pending" ? (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busy === key}
                  onClick={() => void respond(row, true)}
                  className="btn btn-primary h-8 flex-1 py-0 text-xs disabled:opacity-50"
                >
                  {busy === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5" /> Accept</>}
                </button>
                <button
                  type="button"
                  disabled={busy === key}
                  onClick={() => void respond(row, false)}
                  className="btn btn-ghost h-8 flex-1 py-0 text-xs disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" /> Decline
                </button>
              </div>
            ) : (
              <p className="mt-2 text-[12px] font-medium text-white/50 capitalize">{row.status}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PostForm({
  initialKind,
  onClose,
  onPosted,
}: {
  initialKind: PostKind;
  onClose: () => void;
  onPosted: (kind: PostKind) => void;
}) {
  const { showToast } = useSession();
  const [kind, setKind] = useState<PostKind>(initialKind);
  const [role, setRole] = useState(ROLES[0].id);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [budget, setBudget] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [remoteOk, setRemoteOk] = useState(true);
  const [busy, setBusy] = useState(false);
  const isCommission = kind === "commission";

  function toggleGenre(g: string) {
    setGenres((x) => (x.includes(g) ? x.filter((y) => y !== g) : [...x, g].slice(0, 5)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 3) return;
    setBusy(true);
    try {
      await api.createOpportunity({
        roleNeeded: role,
        title: title.trim(),
        body: body.trim() || undefined,
        genres,
        remoteOk,
        kind,
        budget: isCommission && budget.trim() ? budget.trim() : undefined,
      });
      onPosted(kind);
    } catch {
      setBusy(false);
      showToast("Couldn't post.");
    }
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-white/10 bg-ink-900/95 p-5 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-gradient">
            {isCommission ? "Post a commission" : "Post an opportunity"}
          </h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full glass">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          {(["collab", "commission"] as PostKind[]).map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => setKind(k)}
              className={cx(
                "flex items-center justify-center gap-1.5 rounded-xl border py-2 text-sm font-semibold transition active:scale-[0.98]",
                kind === k ? "border-veil-400/60 bg-veil-500/20 text-white" : "border-white/10 bg-white/[0.03] text-white/60",
              )}
            >
              {k === "collab" ? (
                <><Briefcase className="h-4 w-4" /> Collab</>
              ) : (
                <><DollarSign className="h-4 w-4" /> Commission</>
              )}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-white/60">
            {isCommission ? "Creator role you need" : "Role needed"}
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white"
          >
            {ROLES.map((r) => (
              <option key={r.id} value={r.id} className="bg-ink-900">{r.label}</option>
            ))}
          </select>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 80))}
            placeholder={isCommission ? "Title (e.g. Album cover illustration)" : "Title (e.g. Neo-soul EP needs a bassist)"}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none"
          />
          {isCommission && (
            <div className="relative">
              <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-300/70" />
              <input
                value={budget}
                onChange={(e) => setBudget(e.target.value.slice(0, 40))}
                placeholder="Budget (e.g. $300 fixed, $50/hr, $500–$1,000)"
                className="w-full rounded-xl border border-amber-400/20 bg-amber-400/[0.04] py-3 pl-9 pr-3.5 text-sm text-white placeholder:text-white/35 focus:border-amber-400/50 focus:outline-none"
              />
            </div>
          )}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 400))}
            rows={3}
            placeholder={isCommission ? "The brief — deliverables, timeline, references…" : "Details…"}
            className="resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none"
          />
          <div className="flex flex-wrap gap-1.5">
            {GENRES.slice(0, 12).map((g) => (
              <button
                type="button"
                key={g}
                onClick={() => toggleGenre(g)}
                className={cx(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                  genres.includes(g) ? "bg-veil-500/30 text-white ring-1 ring-veil-400/50" : "bg-white/[0.04] text-white/55",
                )}
              >
                {g}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setRemoteOk((v) => !v)} className="flex items-center gap-2 text-sm text-white/75">
            <span
              className={cx(
                "flex h-5 w-5 items-center justify-center rounded-md border",
                remoteOk ? "border-feel bg-feel/20 text-feel" : "border-white/20",
              )}
            >
              {remoteOk && <Check className="h-3.5 w-3.5" />}
            </span>{" "}
            Remote OK
          </button>
          <button type="submit" disabled={busy || title.trim().length < 3} className="btn btn-primary mt-1 w-full py-3">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isCommission ? "Post commission" : "Post opportunity"}
          </button>
        </form>
      </div>
    </div>
  );
}
