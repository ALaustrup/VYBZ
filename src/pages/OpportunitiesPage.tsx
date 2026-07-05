import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  Check,
  ChevronDown,
  Disc3,
  Loader2,
  MapPin,
  Plus,
  Send,
  Target,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useApp } from "@/store/AppStore";
import { EmptyState } from "@/components/EmptyState";
import {
  applyToOpportunity,
  createOpportunity,
  fetchMyOpportunities,
  fetchMyPostedOpportunities,
  fetchPostApplicants,
  setOpportunityStatus,
  withdrawApplication,
  type Commitment,
  type MyOpportunity,
  type Opportunity,
  type OpportunityApplicant,
} from "@/lib/backend";
import {
  DAWS,
  DAW_LABEL,
  GENRES,
  MAX_GENRES,
  ROLES,
  ROLE_FAMILIES,
  ROLE_LABEL,
} from "@/lib/profileFields";
import { cx, timeAgo } from "@/lib/utils";

const COMMITMENTS: { id: Commitment; label: string }[] = [
  { id: "one-off", label: "One-off" },
  { id: "session", label: "Session" },
  { id: "ongoing", label: "Ongoing" },
  { id: "band-member", label: "Band member" },
];

/**
 * Opportunities — the explicit "seeking" board (§7.4). A creator posts what role
 * they need; everyone who OFFERS that role sees it here, best-fit first. Authors
 * review ranked applicants. Complements profile↔profile collab_matches with
 * intent-declared openings.
 */
export function OpportunitiesPage() {
  const { backendEnabled, hasWallet, openAccountGate, showToast } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"find" | "mine">("find");
  const [composing, setComposing] = useState(false);

  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [mine, setMine] = useState<MyOpportunity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, b] = await Promise.all([
      fetchMyOpportunities(40),
      fetchMyPostedOpportunities(),
    ]);
    setOpps(a);
    setMine(b);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (backendEnabled) void load();
    else setLoading(false);
  }, [backendEnabled, load]);

  const onApply = useCallback(
    async (o: Opportunity) => {
      if (!hasWallet) return openAccountGate();
      const ok = await applyToOpportunity(o.id);
      if (ok) {
        setOpps((list) =>
          list.map((x) => (x.id === o.id ? { ...x, applied: true } : x))
        );
        showToast("Application sent.");
      } else {
        showToast("Couldn't apply — try again.");
      }
    },
    [hasWallet, openAccountGate, showToast]
  );

  const onWithdraw = useCallback(
    async (o: Opportunity) => {
      await withdrawApplication(o.id);
      setOpps((list) =>
        list.map((x) => (x.id === o.id ? { ...x, applied: false } : x))
      );
      showToast("Application withdrawn.");
    },
    [showToast]
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 pb-1 pt-3">
        <button
          onClick={() => navigate("/connect")}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="flex items-center gap-2 font-display text-xl font-bold text-gradient">
          <Briefcase className="h-5 w-5 text-veil-300" /> Opportunities
        </h1>
        <button
          onClick={() => (hasWallet ? setComposing(true) : openAccountGate())}
          className="ml-auto flex items-center gap-1.5 rounded-full bg-veil-500 px-3 py-1.5 text-xs font-semibold text-white shadow-glow active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" /> Post
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 pb-2 pt-1">
        {(
          [
            ["find", "Find work"],
            ["mine", "My posts"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cx(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95",
              tab === id
                ? "bg-white/10 text-white ring-1 ring-white/15"
                : "bg-white/[0.03] text-white/50"
            )}
          >
            {label}
            {id === "mine" && mine.length > 0 && (
              <span className="ml-1 text-white/40">({mine.length})</span>
            )}
          </button>
        ))}
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6 pt-1">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-veil-300" />
          </div>
        ) : !backendEnabled ? (
          <EmptyState
            icon={Briefcase}
            title="Opportunities are offline"
            body="Connect the backend to post and discover collaboration openings."
          />
        ) : tab === "find" ? (
          opps.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No openings match you yet"
              body="Opportunities appear here when someone needs a role you offer. Add the roles you bring on your profile to widen your matches."
            />
          ) : (
            <div className="space-y-2.5">
              {opps.map((o) => (
                <OpportunityCard
                  key={o.id}
                  o={o}
                  onOpenAuthor={() =>
                    hasWallet ? navigate(`/u/${o.authorId}`) : openAccountGate()
                  }
                  onApply={() => onApply(o)}
                  onWithdraw={() => onWithdraw(o)}
                />
              ))}
            </div>
          )
        ) : mine.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="You haven't posted yet"
            body="Post an opportunity to let the right collaborators find you — every creator who offers the role you need will see it, best-fit first."
          />
        ) : (
          <div className="space-y-2.5">
            {mine.map((p) => (
              <MyPostCard
                key={p.id}
                post={p}
                onStatus={async (s) => {
                  await setOpportunityStatus(p.id, s);
                  setMine((list) =>
                    list.map((x) => (x.id === p.id ? { ...x, status: s } : x))
                  );
                }}
                onOpenUser={(id) =>
                  hasWallet ? navigate(`/u/${id}`) : openAccountGate()
                }
              />
            ))}
          </div>
        )}
      </div>

      {composing && (
        <Composer
          onClose={() => setComposing(false)}
          onCreated={() => {
            setComposing(false);
            setTab("mine");
            showToast("Opportunity posted.");
            void load();
          }}
        />
      )}
    </div>
  );
}

function OpportunityCard({
  o,
  onOpenAuthor,
  onApply,
  onWithdraw,
}: {
  o: Opportunity;
  onOpenAuthor: () => void;
  onApply: () => void;
  onWithdraw: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-aqua-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-aqua-200">
              {o.roleLabel}
            </span>
            {o.commitment && (
              <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-medium text-white/60">
                {o.commitment.replace("-", " ")}
              </span>
            )}
            <span className="text-[11px] text-white/35">{Math.round(o.fit * 100)}% fit</span>
          </div>
          <p className="font-display font-semibold leading-tight text-white">{o.title}</p>
          <button onClick={onOpenAuthor} className="mt-0.5 text-xs text-white/45 hover:text-white/70">
            by {o.authorUsername || o.authorAlias} · {timeAgo(o.createdAt)}
          </button>
        </div>
      </div>

      {o.body && <p className="mt-2 text-sm text-white/70">{o.body}</p>}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {o.sharedGenres.slice(0, 3).map((g) => (
          <span key={`g-${g}`} className="rounded-full bg-veil-500/20 px-2 py-0.5 text-[10px] font-medium text-veil-100">
            {g}
          </span>
        ))}
        {o.sharedDaws.slice(0, 2).map((d) => (
          <span key={`d-${d}`} className="rounded-full bg-glow/20 px-2 py-0.5 text-[10px] font-medium text-white">
            <Disc3 className="mr-0.5 inline h-2.5 w-2.5" />
            {DAW_LABEL[d] ?? d}
          </span>
        ))}
        {(o.remoteOk || o.location) && (
          <span className="flex items-center gap-0.5 text-[10px] text-white/40">
            <MapPin className="h-2.5 w-2.5" />
            {o.remoteOk ? "Remote OK" : o.location}
          </span>
        )}
      </div>

      <div className="mt-2.5">
        {o.applied ? (
          <button
            onClick={onWithdraw}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-feel/40 bg-feel/10 py-2 text-xs font-semibold text-feel active:scale-[0.98]"
          >
            <Check className="h-3.5 w-3.5" /> Applied · tap to withdraw
          </button>
        ) : (
          <button
            onClick={onApply}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-white/10 py-2 text-xs font-semibold text-white active:scale-[0.98]"
          >
            <Send className="h-3.5 w-3.5" /> Apply
          </button>
        )}
      </div>
    </div>
  );
}

function MyPostCard({
  post,
  onStatus,
  onOpenUser,
}: {
  post: MyOpportunity;
  onStatus: (s: "open" | "filled" | "closed") => void;
  onOpenUser: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [applicants, setApplicants] = useState<OpportunityApplicant[] | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    const next = !open;
    setOpen(next);
    if (next && applicants === null) {
      setLoading(true);
      setApplicants(await fetchPostApplicants(post.id));
      setLoading(false);
    }
  }, [open, applicants, post.id]);

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3.5">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-aqua-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-aqua-200">
          {ROLE_LABEL[post.roleNeeded] ?? post.roleNeeded}
        </span>
        <p className="min-w-0 flex-1 truncate font-display font-semibold text-white">
          {post.title}
        </p>
        <button
          onClick={toggle}
          className="flex items-center gap-1 rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-semibold text-white/70 active:scale-95"
        >
          <Users className="h-3 w-3" /> {post.applicants}
          <ChevronDown className={cx("h-3 w-3 transition", open && "rotate-180")} />
        </button>
      </div>

      <div className="mt-2 flex gap-1.5">
        {(["open", "filled", "closed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => onStatus(s)}
            className={cx(
              "rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize transition active:scale-95",
              post.status === s
                ? s === "open"
                  ? "bg-feel/25 text-feel ring-1 ring-feel/40"
                  : "bg-white/15 text-white"
                : "bg-white/[0.04] text-white/45"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {open && (
        <div className="mt-3 border-t border-white/8 pt-3">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-veil-300" />
            </div>
          ) : !applicants || applicants.length === 0 ? (
            <p className="py-3 text-center text-xs text-white/40">No applicants yet.</p>
          ) : (
            <div className="space-y-2">
              {applicants.map((a) => (
                <button
                  key={a.applicantId}
                  onClick={() => onOpenUser(a.applicantId)}
                  className="flex w-full items-start gap-2.5 rounded-xl bg-white/[0.03] p-2.5 text-left active:scale-[0.99]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-veil-500/20 font-display text-xs font-bold text-veil-100">
                    {(a.username || a.alias).charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-white">
                        {a.username || a.alias}
                      </p>
                      <span className="text-[10px] text-white/35">
                        {Math.round(a.fit * 100)}% fit · skill {a.skill}
                      </span>
                    </div>
                    {a.message && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-white/60">{a.message}</p>
                    )}
                    {(a.sharedGenres.length > 0 || a.sharedDaws.length > 0) && (
                      <p className="mt-0.5 truncate text-[10px] text-veil-200/80">
                        {[...a.sharedGenres, ...a.sharedDaws.map((d) => DAW_LABEL[d] ?? d)]
                          .slice(0, 4)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  <UserPlus className="mt-1 h-3.5 w-3.5 shrink-0 text-white/40" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Composer({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [role, setRole] = useState("");
  const [body, setBody] = useState("");
  const [commitment, setCommitment] = useState<Commitment | "">("");
  const [genres, setGenres] = useState<string[]>([]);
  const [daws, setDaws] = useState<string[]>([]);
  const [remoteOk, setRemoteOk] = useState(true);
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  const canPost = title.trim().length > 2 && !!role;

  const toggle = (arr: string[], set: (v: string[]) => void, v: string, max?: number) => {
    const s = new Set(arr);
    if (s.has(v)) s.delete(v);
    else {
      if (max && s.size >= max) return;
      s.add(v);
    }
    set([...s]);
  };

  const submit = async () => {
    if (!canPost || saving) return;
    setSaving(true);
    const id = await createOpportunity({
      roleNeeded: role,
      title: title.trim(),
      body: body.trim() || undefined,
      genres,
      daws,
      remoteOk,
      location: location.trim() || null,
      commitment: commitment || null,
    });
    setSaving(false);
    if (id) onCreated();
  };

  return (
    <div
      className="fixed inset-0 z-[60] mx-auto flex max-w-md flex-col justify-end bg-ink-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-ink-900 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-white">Post an opportunity</h2>
          <button onClick={onClose} className="rounded-full bg-white/8 p-1.5 active:scale-90">
            <X className="h-4 w-4 text-white/70" />
          </button>
        </div>

        <label className="mb-1 block text-[11px] uppercase tracking-wider text-white/40">
          Role needed
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="mb-3 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-white focus:outline-none"
        >
          <option value="">Choose a role…</option>
          {ROLE_FAMILIES.map((fam) => (
            <optgroup key={fam.id} label={fam.label}>
              {ROLES.filter((r) => r.family === fam.id).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          placeholder="Title — e.g. Rock band needs a lead guitarist"
          className="mb-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-veil-400/60 focus:outline-none"
        />

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Details — vibe, commitment, what you're building…"
          className="mb-3 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-veil-400/60 focus:outline-none"
        />

        <label className="mb-1 block text-[11px] uppercase tracking-wider text-white/40">
          Commitment
        </label>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {COMMITMENTS.map((c) => (
            <button
              key={c.id}
              onClick={() => setCommitment(commitment === c.id ? "" : c.id)}
              className={cx(
                "rounded-full px-3 py-1 text-xs font-medium transition active:scale-95",
                commitment === c.id
                  ? "bg-aqua-400/25 text-white ring-1 ring-aqua-400/50"
                  : "bg-white/[0.04] text-white/55"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        <label className="mb-1 block text-[11px] uppercase tracking-wider text-white/40">
          Genres
        </label>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => toggle(genres, setGenres, g, MAX_GENRES)}
              className={cx(
                "rounded-full px-2.5 py-1 text-xs font-medium transition active:scale-95",
                genres.includes(g)
                  ? "bg-veil-500/30 text-white ring-1 ring-veil-400/50"
                  : "bg-white/[0.04] text-white/55"
              )}
            >
              {g}
            </button>
          ))}
        </div>

        <label className="mb-1 block text-[11px] uppercase tracking-wider text-white/40">
          DAWs
        </label>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {DAWS.map((d) => (
            <button
              key={d.id}
              onClick={() => toggle(daws, setDaws, d.id)}
              className={cx(
                "rounded-full px-2.5 py-1 text-xs font-medium transition active:scale-95",
                daws.includes(d.id)
                  ? "bg-glow/25 text-white ring-1 ring-glow/50"
                  : "bg-white/[0.04] text-white/55"
              )}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={() => setRemoteOk((v) => !v)}
            className={cx(
              "rounded-full px-3 py-1 text-xs font-semibold transition active:scale-95",
              remoteOk
                ? "bg-feel/25 text-white ring-1 ring-feel/50"
                : "bg-white/[0.04] text-white/55"
            )}
          >
            Remote OK
          </button>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={60}
            placeholder="Location (optional)"
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
        </div>

        <button
          onClick={submit}
          disabled={!canPost || saving}
          className={cx(
            "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition active:scale-[0.98]",
            canPost && !saving
              ? "bg-veil-500 text-white shadow-glow"
              : "bg-white/8 text-white/40"
          )}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Post opportunity
        </button>
      </div>
    </div>
  );
}
