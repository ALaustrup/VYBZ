import { useState } from "react";
import { Loader2, ArrowRight, Check } from "lucide-react";
import { joinAlphaWaitlist } from "@/lib/waitlist";
import { Link } from "react-router-dom";

export function WaitlistForm({ id }: { id?: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"joined" | "already" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await joinAlphaWaitlist(email, "landing");
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setDone(res.status);
  }

  if (done) {
    return (
      <div id={id} className="mx-auto max-w-md text-center">
        <p className="inline-flex items-center gap-2 font-display text-lg font-semibold text-cyan-300">
          <Check className="h-5 w-5" />
          {done === "already" ? "You're already on the list." : "You're on the list."}
        </p>
        <p className="mt-2 text-sm text-white/55">
          We'll email you when invite keys open. If you already have a key, sign in and redeem it.
        </p>
        <Link to="/enter" className="mt-4 inline-block text-sm text-cyan-300/90 underline-offset-4 hover:underline">
          Enter with invite key
        </Link>
      </div>
    );
  }

  return (
    <form id={id} onSubmit={submit} className="mx-auto flex w-full max-w-md flex-col gap-3 sm:flex-row sm:items-stretch">
      <label className="sr-only" htmlFor="waitlist-email">Email</label>
      <input
        id="waitlist-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        autoComplete="email"
        className="min-h-[48px] flex-1 rounded-full border border-white/15 bg-black/40 px-5 text-[15px] text-white placeholder:text-white/35 outline-none ring-cyan-400/0 transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/30"
      />
      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300 px-6 font-display text-sm font-bold text-ink-950 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Join alpha <ArrowRight className="h-4 w-4" /></>}
      </button>
      {err && <p className="w-full text-center text-xs text-rose-300 sm:col-span-2">{err}</p>}
    </form>
  );
}
