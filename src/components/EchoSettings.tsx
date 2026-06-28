import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useApp } from "@/store/AppStore";
import {
  deleteMyEcho,
  fetchEchoTranscript,
  fetchEchoVisitors,
  fetchMyEcho,
  saveMyEcho,
} from "@/lib/backend";
import type { CompanionMessage, EchoConfig, EchoVisitor } from "@/types";
import { cx, timeAgo } from "@/lib/utils";

const TONES: { id: EchoConfig["tone"]; label: string }[] = [
  { id: "warm", label: "Warm" },
  { id: "playful", label: "Playful" },
  { id: "direct", label: "Direct" },
  { id: "thoughtful", label: "Thoughtful" },
];

/**
 * Owner control panel for your Echo — an opt-in AI version of you that can chat
 * with people while you're away. Consent is explicit and revocable; you can
 * review every conversation and delete it (and all its messages) at any time.
 */
export function EchoSettings() {
  const { identity, showToast } = useApp();
  const isAdult = (identity.age ?? 0) >= 18;

  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [tone, setTone] = useState<EchoConfig["tone"]>("warm");
  const [greeting, setGreeting] = useState("");
  const [bioSeed, setBioSeed] = useState("");
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchMyEcho().then((e) => {
      if (!alive) return;
      if (e) {
        setEnabled(e.enabled);
        setDisplayName(e.displayName);
        setTone(e.tone);
        setGreeting(e.greeting);
        setBioSeed(e.bioSeed);
        setConsent(Boolean(e.consentAt));
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function save(nextEnabled: boolean) {
    if (nextEnabled && !consent) {
      showToast("Please confirm the consent box first.");
      return;
    }
    setSaving(true);
    const ok = await saveMyEcho({
      enabled: nextEnabled,
      displayName,
      tone,
      greeting,
      bioSeed,
    });
    setSaving(false);
    if (!ok) {
      showToast("Couldn't save your Echo — try again.");
      return;
    }
    setEnabled(nextEnabled);
    showToast(nextEnabled ? "Your Echo is live." : "Echo saved.");
  }

  async function remove() {
    if (!confirm("Delete your Echo and all of its conversations? This can't be undone.")) return;
    setSaving(true);
    const ok = await deleteMyEcho();
    setSaving(false);
    if (!ok) {
      showToast("Couldn't delete — try again.");
      return;
    }
    setEnabled(false);
    setConsent(false);
    setDisplayName("");
    setGreeting("");
    setBioSeed("");
    showToast("Your Echo was deleted.");
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-aqua-300" />
        <h3 className="font-display text-sm font-semibold text-white">Your Echo</h3>
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/55">
          AI · 18+
        </span>
        {enabled && (
          <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live
          </span>
        )}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-white/50">
        An optional AI version of you that can chat with people while you're away. It speaks only
        from the profile details you choose to share (never private sections), is always shown as an
        AI Echo, and never makes plans or promises for you. You can review every conversation and
        delete it anytime.
      </p>

      {loading ? (
        <div className="flex h-16 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-aqua-300" />
        </div>
      ) : !isAdult ? (
        <p className="mt-3 rounded-xl bg-white/[0.03] p-3 text-xs text-white/50">
          Echoes are available to verified adults (18+). Add your age in the profile basics above to
          unlock this.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {/* Display name. */}
          <label className="block">
            <span className="text-[11px] font-medium text-white/55">Echo name</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, 40))}
              placeholder="Defaults to your username"
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-aqua-400/60 focus:outline-none"
            />
          </label>

          {/* Tone. */}
          <div>
            <span className="text-[11px] font-medium text-white/55">Vibe</span>
            <div className="mt-1 grid grid-cols-4 gap-1.5">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  className={cx(
                    "rounded-lg py-2 text-xs font-semibold transition",
                    tone === t.id
                      ? "bg-veil-500 text-white"
                      : "bg-white/[0.05] text-white/60 hover:bg-white/10"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Greeting. */}
          <label className="block">
            <span className="text-[11px] font-medium text-white/55">Opening line (optional)</span>
            <input
              value={greeting}
              onChange={(e) => setGreeting(e.target.value.slice(0, 140))}
              placeholder="Hey! I'm away, but my Echo's happy to chat."
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-aqua-400/60 focus:outline-none"
            />
          </label>

          {/* Bio seed. */}
          <label className="block">
            <span className="text-[11px] font-medium text-white/55">
              How your Echo should come across (optional)
            </span>
            <textarea
              value={bioSeed}
              onChange={(e) => setBioSeed(e.target.value.slice(0, 400))}
              rows={2}
              placeholder="A note in your own words to guide its style."
              className="mt-1 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-aqua-400/60 focus:outline-none"
            />
          </label>

          {/* Consent. */}
          <label className="flex items-start gap-2.5 rounded-xl bg-white/[0.03] p-3">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-aqua-400"
            />
            <span className="text-[11px] leading-relaxed text-white/55">
              I understand my Echo is an AI built from what I share, that it will be clearly labelled
              as AI to others, and that I can turn it off or delete it anytime. See our{" "}
              <Link to="/legal/transparency" className="text-aqua-300 underline">
                Transparency
              </Link>{" "}
              page.
            </span>
          </label>

          {/* Actions. */}
          <div className="flex gap-2">
            {enabled ? (
              <button
                onClick={() => void save(false)}
                disabled={saving}
                className="flex-1 rounded-xl border border-white/12 bg-white/[0.05] py-2.5 text-sm font-semibold text-white/80 transition active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? "…" : "Pause Echo"}
              </button>
            ) : null}
            <button
              onClick={() => void save(true)}
              disabled={saving || (!enabled && !consent)}
              className="flex-1 rounded-xl bg-veil-500 py-2.5 text-sm font-semibold text-white shadow-glow transition active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? "…" : enabled ? "Save changes" : "Turn on my Echo"}
            </button>
          </div>

          {/* Transcript review. */}
          <button
            onClick={() => setReviewOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5 text-left"
          >
            <span className="text-xs font-medium text-white/70">Review conversations</span>
            <ChevronDown
              className={cx("h-4 w-4 text-white/40 transition", reviewOpen && "rotate-180")}
            />
          </button>
          {reviewOpen && <EchoReview />}

          {/* Delete. */}
          <button
            onClick={() => void remove()}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 py-1 text-xs font-medium text-rose-300/80 transition hover:text-rose-300 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete my Echo &amp; its conversations
          </button>
        </div>
      )}
    </div>
  );
}

function EchoReview() {
  const [visitors, setVisitors] = useState<EchoVisitor[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [thread, setThread] = useState<CompanionMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);

  useEffect(() => {
    fetchEchoVisitors().then(setVisitors);
  }, []);

  async function open(visitorId: string) {
    if (active === visitorId) {
      setActive(null);
      return;
    }
    setActive(visitorId);
    setThreadLoading(true);
    const t = await fetchEchoTranscript(visitorId);
    setThread(t);
    setThreadLoading(false);
  }

  if (visitors === null) {
    return (
      <div className="flex h-12 items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-white/40" />
      </div>
    );
  }
  if (visitors.length === 0) {
    return (
      <p className="px-1 py-2 text-[11px] text-white/40">No conversations yet.</p>
    );
  }

  return (
    <div className="space-y-1.5">
      {visitors.map((v) => (
        <div key={v.visitorId} className="rounded-xl bg-white/[0.02]">
          <button
            onClick={() => void open(v.visitorId)}
            className="flex w-full items-center justify-between px-3 py-2 text-left"
          >
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium text-white/80">
                {v.username || v.alias || "Member"}
              </span>
              <span className="text-[10px] text-white/40">
                {v.msgs} messages · {timeAgo(v.lastAt)}
              </span>
            </span>
            <ChevronDown
              className={cx(
                "h-3.5 w-3.5 text-white/40 transition",
                active === v.visitorId && "rotate-180"
              )}
            />
          </button>
          {active === v.visitorId && (
            <div className="max-h-56 space-y-1.5 overflow-y-auto px-3 pb-3">
              {threadLoading ? (
                <div className="flex h-10 items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-white/40" />
                </div>
              ) : (
                thread.map((m, i) => (
                  <div
                    key={i}
                    className={cx("flex", m.role === "assistant" ? "justify-start" : "justify-end")}
                  >
                    <span
                      className={cx(
                        "max-w-[85%] whitespace-pre-wrap rounded-lg px-2.5 py-1.5 text-[11px] leading-relaxed",
                        m.role === "assistant"
                          ? "bg-aqua-500/15 text-white/85"
                          : "bg-veil-500/80 text-white"
                      )}
                    >
                      {m.content}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
