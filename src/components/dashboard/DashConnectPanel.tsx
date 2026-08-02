import { useCallback, useEffect, useMemo, useState } from "react";
import { Flame, Heart, Loader2, Lock, Search, UserPlus } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { formatVcAddress } from "@/lib/vc";
import { isAdultBirthYear } from "@/lib/profileFields";
import { cx } from "@/lib/utils";

const SPICE_KEY = "vybz.connectionLab.spice";

const INTENT_CHIPS = [
  "music taste",
  "collab",
  "friendship",
  "meetup",
  "romance",
  "roleplay",
  "cam",
  "sexting",
];

type Row = {
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  fit: number;
  blurb: string;
};

/**
 * Connection Lab — taste matches by default; opt-in spice for 18+ deep matching.
 */
export function DashConnectPanel() {
  const { showToast, profile } = useSession();
  const adult = isAdultBirthYear(profile?.profile?.birthYear);
  const [spice, setSpice] = useState(() => {
    try { return localStorage.getItem(SPICE_KEY) === "1"; } catch { return false; }
  });
  const [q, setQ] = useState("");
  const [chip, setChip] = useState("music taste");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    if (spice && adult && chip !== "music taste" && chip !== "collab") {
      const deck = chip === "meetup" ? "meetup" : "love";
      const vibe = await api.vibeMatches(deck, 40, {
        lookingFor: [chip],
      });
      setRows(vibe.map((r) => ({
        userId: r.userId,
        username: r.username,
        displayName: null,
        avatarUrl: null,
        fit: r.fit,
        blurb: r.why || [...r.lookingFor, ...r.meetupIntents].slice(0, 4).join(" · "),
      })));
    } else {
      const taste = await api.tasteMatches(40);
      setRows(taste.map((t) => ({
        userId: t.userId,
        username: t.username,
        displayName: t.displayName,
        avatarUrl: t.avatarUrl,
        fit: t.fit,
        blurb: [
          t.sharedPlays ? `${t.sharedPlays} shared listens` : null,
          ...(t.sharedGenres ?? []).slice(0, 3),
        ].filter(Boolean).join(" · "),
      })));
    }
    setLoading(false);
  }, [spice, adult, chip]);

  useEffect(() => { void load(); }, [load]);

  function toggleSpice(on: boolean) {
    if (on && !adult) {
      showToast("Spice requires 18+ — set birth year in Edit");
      return;
    }
    setSpice(on);
    try { localStorage.setItem(SPICE_KEY, on ? "1" : "0"); } catch { /* ignore */ }
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      [r.username, r.displayName, r.blurb].some((x) => (x ?? "").toLowerCase().includes(needle)),
    );
  }, [rows, q]);

  async function connect(id: string) {
    setBusyId(id);
    try {
      await api.connect(id);
      void api.logMatchFeedback(id, "connect", "connect_page");
      showToast("Connect sent");
      setRows((prev) => prev.filter((r) => r.userId !== id));
    } catch (e) {
      showToast((e as Error).message || "Failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <section className="forge-card">
        <p className="nexus-headline text-lg">Connection Lab</p>
        <p className="mt-1 text-[12px] leading-relaxed text-white/45">
          Music-taste matches stay front and center. Unlock spice for romance, meetups, and
          adult-consensual intents — never overwhelming unless you ask for it.
        </p>
        <label className="mt-3 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 accent-[rgb(var(--neon-cyan))]"
            checked={spice}
            onChange={(e) => toggleSpice(e.target.checked)}
          />
          <span>
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-white/85">
              <Flame className="h-3.5 w-3.5 text-wild" /> Enable spice (18+)
            </span>
            <span className="mt-0.5 block text-[11px] text-white/40">
              Roleplay, cam, sexting, romance, IRL — consenting adults only. Off by default.
            </span>
          </span>
        </label>
        {!adult && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-200/80">
            <Lock className="h-3 w-3" /> Add birth year in Edit to unlock spice.
          </p>
        )}
      </section>

      <div className="forge-field">
        <Search className="forge-field-icon h-4 w-4" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search anyone · any vibe · any intent…"
        />
      </div>

      {spice && adult && (
        <div className="flex flex-wrap gap-1.5">
          {INTENT_CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChip(c)}
              className={cx("forge-chip", chip === c ? "forge-chip--active" : "")}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-cyan-300" /></div>
      ) : filtered.length === 0 ? (
        <p className="forge-card py-10 text-center text-sm text-white/40">
          <Heart className="mx-auto mb-2 h-6 w-6 text-white/25" />
          No matches yet — listen more, leave feedback, or broaden search.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((m) => (
            <li key={m.userId} className="forge-card flex items-center gap-3 !py-3">
              <Avatar url={m.avatarUrl} name={m.displayName || m.username} id={m.userId} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[15px] font-semibold text-white">
                  {m.displayName || m.username || "Member"}
                </p>
                <p className="truncate font-mono text-[11px] text-cyan-200/70">{formatVcAddress(m.username)}</p>
                <p className="mt-0.5 truncate text-[11px] text-white/40">
                  {Math.round(Math.min(1, Math.max(0, m.fit)) * 100)}% fit
                  {m.blurb ? ` · ${m.blurb}` : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={busyId === m.userId}
                onClick={() => void connect(m.userId)}
                className="forge-cta !min-h-10 !rounded-full !px-3 !text-xs disabled:opacity-40"
              >
                {busyId === m.userId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                Connect
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
