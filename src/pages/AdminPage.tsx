import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Ban,
  Check,
  Coins,
  Crown,
  EyeOff,
  Flag,
  Inbox,
  Loader2,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useApp } from "@/store/AppStore";
import * as backend from "@/lib/backend";
import { cx, timeAgo } from "@/lib/utils";

type Tab = "reports" | "users" | "feedback" | "compose";

export function AdminPage() {
  const { isAdmin, claimAdmin, showToast } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("reports");

  if (!isAdmin) return <ClaimAdmin onClaim={claimAdmin} showToast={showToast} />;

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-4 pb-10">
      <div className="flex items-center gap-3 pt-4">
        <button
          onClick={() => navigate("/profile")}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="flex items-center gap-2 font-display text-xl font-bold text-white">
          <ShieldCheck className="h-5 w-5 text-veil-300" /> Operator console
        </h1>
      </div>

      <div className="my-4 flex gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
        {([
          { id: "reports", label: "Reports", icon: Flag },
          { id: "users", label: "Users", icon: Users },
          { id: "feedback", label: "Feedback", icon: Inbox },
          { id: "compose", label: "Compose", icon: Send },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cx(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold transition",
              tab === id ? "bg-veil-500 text-white shadow-glow" : "text-white/55"
            )}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === "reports" && <ReportsTab showToast={showToast} />}
      {tab === "users" && <UsersTab showToast={showToast} />}
      {tab === "feedback" && <FeedbackTab showToast={showToast} />}
      {tab === "compose" && <ComposeTab showToast={showToast} />}
    </div>
  );
}

function ClaimAdmin({
  onClaim,
  showToast,
}: {
  onClaim: (code: string) => Promise<boolean>;
  showToast: (t: string) => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit() {
    setBusy(true);
    const ok = await onClaim(code.trim());
    setBusy(false);
    showToast(ok ? "Operator access granted." : "Invalid code (sign in with an email first).");
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <ShieldCheck className="mb-4 h-10 w-10 text-veil-300" />
      <h1 className="font-display text-2xl font-bold text-white">Operator access</h1>
      <p className="mt-2 max-w-xs text-sm text-white/55">
        Enter your one-time operator code. Requires an email-linked account.
      </p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="VYBZ-ADMIN-…"
        className="mt-5 w-full max-w-xs rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm text-white placeholder:text-white/30 focus:outline-none"
      />
      <button
        onClick={submit}
        disabled={busy || !code.trim()}
        className="mt-3 flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-veil-500 py-3 font-semibold text-white shadow-glow active:scale-95 disabled:opacity-40"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Unlock
      </button>
      <button onClick={() => navigate("/profile")} className="mt-4 text-xs text-white/40">
        Back
      </button>
    </div>
  );
}

function ReportsTab({ showToast }: { showToast: (t: string) => void }) {
  const [reports, setReports] = useState<backend.ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    void backend.adminListReports().then((r) => {
      setReports(r);
      setLoading(false);
    });
  };
  useEffect(load, []);

  if (loading) return <Spinner />;
  if (reports.length === 0)
    return <Empty text="No reports. The community's behaving." />;

  return (
    <ul className="space-y-2">
      {reports.map((r) => (
        <li
          key={r.id}
          className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-wild">
              <Flag className="h-3.5 w-3.5" /> {r.target_type}
            </span>
            <span className="text-[10px] text-white/35">{timeAgo(new Date(r.created_at).getTime())}</span>
          </div>
          {r.reason && <p className="mt-1 text-sm text-white/80">{r.reason}</p>}
          <p className="mt-1 break-all text-[10px] text-white/35">{r.target_id}</p>
          {r.target_type === "confession" && (
            <div className="mt-2 flex gap-2">
              <button
                onClick={async () => {
                  await backend.adminSetHidden(r.target_id, true);
                  showToast("Content hidden.");
                }}
                className="flex items-center gap-1.5 rounded-full bg-wild/15 px-3 py-1.5 text-xs font-semibold text-wild active:scale-95"
              >
                <EyeOff className="h-3.5 w-3.5" /> Hide
              </button>
              <button
                onClick={async () => {
                  await backend.adminSetHidden(r.target_id, false);
                  showToast("Content restored.");
                }}
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/60 active:scale-95"
              >
                Restore
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function UsersTab({ showToast }: { showToast: (t: string) => void }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<backend.AdminUserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<backend.AdminStats | null>(null);

  const search = () => {
    setLoading(true);
    void backend.adminSearchUsers(query).then((u) => {
      setUsers(u);
      setLoading(false);
    });
  };
  useEffect(search, []);
  useEffect(() => {
    void backend.fetchAdminStats().then(setStats);
  }, []);

  const conversion =
    stats && stats.total > 0 ? Math.round((stats.members / stats.total) * 100) : 0;

  return (
    <div>
      {/* Conversion dashboard. */}
      <div className="mb-3 grid grid-cols-4 gap-2">
        <StatBox label="Users" value={stats?.total ?? 0} />
        <StatBox label="Members" value={stats?.members ?? 0} tone="text-feel" />
        <StatBox label="Guests" value={stats?.guests ?? 0} tone="text-white/70" />
        <StatBox label="Conv." value={`${conversion}%`} tone="text-veil-200" />
      </div>
      <div className="mb-3 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Search username / id…"
          className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none"
        />
        <button onClick={search} className="rounded-xl bg-veil-500 px-4 text-sm font-semibold text-white active:scale-95">
          Search
        </button>
      </div>
      {loading ? (
        <Spinner />
      ) : (
        <ul className="space-y-2">
          {users.map((u) => (
            <UserRow key={u.id} user={u} showToast={showToast} />
          ))}
        </ul>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  tone = "text-white",
}: {
  label: string;
  value: number | string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-center">
      <p className={`font-display text-lg font-bold ${tone}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-white/45">{label}</p>
    </div>
  );
}

function UserRow({
  user,
  showToast,
}: {
  user: backend.AdminUserRow;
  showToast: (t: string) => void;
}) {
  const [godmode, setGodmode] = useState(user.godmode);
  const [banned, setBanned] = useState(user.banned);
  const [gender, setGender] = useState(user.gender);
  const [age, setAge] = useState<string>(user.age != null ? String(user.age) : "");
  const [credits, setCredits] = useState<number>(user.credits ?? 0);
  const [grantAmt, setGrantAmt] = useState<string>("");
  const [grantNote, setGrantNote] = useState<string>("");
  const [grantBusy, setGrantBusy] = useState(false);

  async function grant(amount: number) {
    if (!amount || grantBusy) return;
    setGrantBusy(true);
    const ok = await backend.adminGrantCredits(user.id, amount, grantNote);
    setGrantBusy(false);
    if (!ok) {
      showToast("Couldn't grant V¢.");
      return;
    }
    setCredits((c) => Math.max(0, c + amount));
    setGrantAmt("");
    setGrantNote("");
    showToast(
      amount > 0
        ? `Granted ${amount} V¢ to ${user.username ?? "user"}.`
        : `Deducted ${Math.abs(amount)} V¢ from ${user.username ?? "user"}.`
    );
  }

  return (
    <li className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-display text-sm font-semibold text-white">
          {user.username ?? user.alias ?? "Unnamed"}
          {user.anonymous && (
            <span className="ml-1.5 text-[10px] font-normal text-white/35">guest</span>
          )}
        </span>
        <span className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
            <Coins className="h-3 w-3" /> {credits}
          </span>
          <span className="break-all text-[10px] text-white/30">{user.id.slice(0, 8)}</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={async () => {
            const v = !godmode;
            setGodmode(v);
            await backend.adminSetGodmode(user.id, v);
            showToast(v ? "Godmode granted." : "Godmode revoked.");
          }}
          className={cx(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95",
            godmode ? "bg-amber-400/20 text-amber-300" : "border border-white/10 text-white/55"
          )}
        >
          <Crown className="h-3.5 w-3.5" /> {godmode ? "Godmode on" : "Grant Godmode"}
        </button>
        <button
          onClick={async () => {
            const v = !banned;
            setBanned(v);
            await backend.adminSetBanned(user.id, v);
            showToast(v ? "User banned." : "User unbanned.");
          }}
          className={cx(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95",
            banned ? "bg-wild/20 text-wild" : "border border-white/10 text-white/55"
          )}
        >
          <Ban className="h-3.5 w-3.5" /> {banned ? "Banned" : "Ban"}
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <select
          value={gender ?? ""}
          onChange={(e) => setGender((e.target.value || null) as "M" | "F" | null)}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-white"
        >
          <option value="">— sex —</option>
          <option value="F">Female</option>
          <option value="M">Male</option>
        </select>
        <input
          value={age}
          onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 3))}
          placeholder="age"
          inputMode="numeric"
          className="w-16 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-white placeholder:text-white/30"
        />
        <button
          onClick={async () => {
            await backend.adminChangeIdentity(user.id, gender, age ? Number(age) : null);
            showToast("Identity updated.");
          }}
          className="rounded-full bg-veil-500 px-3 py-1.5 text-xs font-semibold text-white active:scale-95"
        >
          Set
        </button>
        <button
          onClick={async () => {
            await backend.adminGrantIdentityChange(user.id, 1);
            showToast("Granted 1 self-change.");
          }}
          className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/55 active:scale-95"
        >
          +1 change
        </button>
      </div>

      {/* V¢ granting (issue / deduct). Note is optional but logged in the
          credit ledger + admin actions for an audit trail. */}
      <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-2.5">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-amber-200">
          <Coins className="h-3.5 w-3.5" /> Issue V¢ to this wallet
        </div>
        <div className="flex items-center gap-1.5">
          <input
            value={grantAmt}
            onChange={(e) => setGrantAmt(e.target.value.replace(/[^\d-]/g, "").slice(0, 7))}
            placeholder="amount (+/-)"
            inputMode="numeric"
            className="w-28 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-white placeholder:text-white/30"
          />
          <input
            value={grantNote}
            onChange={(e) => setGrantNote(e.target.value.slice(0, 80))}
            placeholder="reason (optional)"
            className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-white placeholder:text-white/30"
          />
          <button
            onClick={() => void grant(Number(grantAmt))}
            disabled={!grantAmt || grantBusy || Number(grantAmt) === 0}
            className="rounded-full bg-amber-400 px-3 py-1.5 text-xs font-bold text-black active:scale-95 disabled:opacity-40"
          >
            {grantBusy ? "…" : "Grant"}
          </button>
        </div>
        <div className="mt-1.5 flex gap-1">
          {[10, 50, 100, 500].map((a) => (
            <button
              key={a}
              onClick={() => void grant(a)}
              disabled={grantBusy}
              className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-amber-200 active:scale-95"
            >
              +{a}
            </button>
          ))}
        </div>
      </div>
    </li>
  );
}

function FeedbackTab({ showToast }: { showToast: (t: string) => void }) {
  const [rows, setRows] = useState<backend.FeedbackRow[]>([]);
  const [status, setStatus] = useState<"open" | "in_progress" | "resolved" | "all">("open");
  const [loading, setLoading] = useState(true);

  const load = (s = status) => {
    setLoading(true);
    void backend.adminListFeedback(s).then((r) => {
      setRows(r);
      setLoading(false);
    });
  };
  useEffect(() => {
    load(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function setRowStatus(
    id: string,
    next: "open" | "in_progress" | "resolved",
    note?: string
  ) {
    const ok = await backend.adminResolveFeedback(id, next, note);
    if (ok) {
      showToast(next === "resolved" ? "Marked resolved." : "Updated.");
      load(status);
    } else {
      showToast("Couldn't update.");
    }
  }

  return (
    <div>
      <div className="mb-3 flex gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 text-[11px]">
        {(["open", "in_progress", "resolved", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cx(
              "flex-1 rounded-full py-1.5 font-semibold transition",
              status === s ? "bg-veil-500 text-white" : "text-white/55"
            )}
          >
            {s === "in_progress" ? "In progress" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Empty text="Nothing here." />
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cx(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    r.category === "bug"
                      ? "bg-wild/20 text-wild"
                      : r.category === "help"
                        ? "bg-feel/20 text-feel"
                        : r.category === "feature"
                          ? "bg-veil-500/20 text-veil-200"
                          : "bg-white/10 text-white/60"
                  )}
                >
                  {r.category}
                </span>
                <span className="text-[10px] text-white/35">
                  {timeAgo(new Date(r.created_at).getTime())}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-snug text-white/85">{r.body}</p>
              {r.contact && (
                <p className="mt-1 text-[11px] text-white/45">contact: {r.contact}</p>
              )}
              {r.url && (
                <p className="mt-1 break-all text-[10px] text-white/30">{r.url}</p>
              )}
              {r.admin_note && (
                <p className="mt-1 rounded-lg bg-white/[0.05] px-2 py-1 text-[11px] text-white/65">
                  note: {r.admin_note}
                </p>
              )}
              <div className="mt-2 flex gap-1.5">
                {(["open", "in_progress", "resolved"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => void setRowStatus(r.id, s)}
                    disabled={r.status === s}
                    className={cx(
                      "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition active:scale-95",
                      r.status === s
                        ? "bg-veil-500 text-white"
                        : "border border-white/10 text-white/55"
                    )}
                  >
                    {s === "resolved" && <Check className="h-3 w-3" />}
                    {s === "in_progress" ? "In progress" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ComposeTab({ showToast }: { showToast: (t: string) => void }) {
  const [users, setUsers] = useState<backend.AdminUserRow[]>([]);
  const [authorId, setAuthorId] = useState("");
  const [body, setBody] = useState("");
  const [nsfw, setNsfw] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void backend.adminSearchUsers("").then((u) => {
      setUsers(u);
      if (u[0]) setAuthorId(u[0].id);
    });
  }, []);

  async function post() {
    if (!authorId || body.trim().length < 4) return;
    setBusy(true);
    const id = await backend.adminCreatePost({
      authorId,
      body: body.trim(),
      nsfw,
      publishAt: scheduled && when ? new Date(when).toISOString() : null,
    });
    setBusy(false);
    if (id) {
      showToast(scheduled ? "Post scheduled." : "Posted.");
      setBody("");
    } else {
      showToast("Couldn't create the post.");
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-white/55">Post as</label>
        <select
          value={authorId}
          onChange={(e) => setAuthorId(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white"
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.username ?? u.alias} · {u.id.slice(0, 6)}
            </option>
          ))}
        </select>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, 280))}
        rows={4}
        placeholder="Write the confession…"
        className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white placeholder:text-white/30 focus:outline-none"
      />
      <label className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] p-3 text-sm text-white/80">
        Mark NSFW (adults only)
        <input type="checkbox" checked={nsfw} onChange={(e) => setNsfw(e.target.checked)} className="h-4 w-4 accent-veil-500" />
      </label>
      <label className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] p-3 text-sm text-white/80">
        Schedule for later
        <input type="checkbox" checked={scheduled} onChange={(e) => setScheduled(e.target.checked)} className="h-4 w-4 accent-veil-500" />
      </label>
      {scheduled && (
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white"
        />
      )}
      <button
        onClick={post}
        disabled={busy || !authorId || body.trim().length < 4}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-veil-500 py-3 font-semibold text-white shadow-glow active:scale-95 disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {scheduled ? "Schedule post" : "Post now"}
      </button>
    </div>
  );
}

const Spinner = () => (
  <div className="flex justify-center py-10">
    <Loader2 className="h-6 w-6 animate-spin text-veil-300" />
  </div>
);
const Empty = ({ text }: { text: string }) => (
  <p className="py-10 text-center text-sm text-white/45">{text}</p>
);
