import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Shield, Loader2, CheckCircle2, Clock, XCircle, Award, Heart } from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import type { MyModApplication } from "@/types";

const inputCls = "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[15px] text-white placeholder:text-white/35 focus:border-aqua-400/60 focus:outline-none";

/**
 * Public-facing "become a moderator" portal. Members pitch why they'd be a good
 * fit; admins review in the console. Approved applicants get moderator access +
 * a rewards balance. Staff are redirected to the mod console.
 */
export function ModApplyPage() {
  const { profile, showToast } = useSession();
  const [app, setApp] = useState<MyModApplication | null | undefined>(undefined);
  const [pitch, setPitch] = useState("");
  const [experience, setExperience] = useState("");
  const [hours, setHours] = useState("");
  const [timezone, setTimezone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isStaff = profile && (profile.platformRole === "moderator" || profile.platformRole === "admin" || profile.isAdmin);

  useRegisterAppBar({
    title: "Join moderation",
    subtitle: "Help keep VYBZ real — and earn rewards",
  }, []);

  useEffect(() => { api.myModApplication().then((a) => setApp(a)); }, []);

  if (profile && isStaff) return <Navigate to="/mod" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await api.submitModApplication({
        pitch: pitch.trim(),
        experience: experience.trim() || undefined,
        hours: hours ? Number(hours) : undefined,
        timezone: timezone.trim() || undefined,
      });
      showToast("Application submitted — thank you!");
      setApp(await api.myModApplication());
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-4 pb-10 pt-3">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-aqua-400/30 to-veil-500/25 ring-1 ring-white/10">
          <Shield className="h-5 w-5 text-aqua-200" />
        </span>
        <p className="text-[13px] text-white/50">Apply below — admins review every pitch.</p>
      </div>

      {app === undefined ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-aqua-300" /></div>
      ) : app && app.status === "pending" ? (
        <StatusCard icon={<Clock className="h-6 w-6 text-amber-300" />} title="Application under review"
          body="Thanks for applying! An admin will review your application soon — you'll get a notification either way." tone="border-amber-400/25 bg-amber-400/[0.05]" />
      ) : app && app.status === "rejected" ? (
        <>
          <StatusCard icon={<XCircle className="h-6 w-6 text-white/50" />} title="Not this time"
            body={app.reviewNote || "Thanks for your interest — we couldn't take you on right now. You're welcome to apply again later."} tone="border-white/10 bg-white/[0.03]" />
          <p className="mt-4 mb-2 text-[11px] uppercase tracking-wider text-white/40">Apply again</p>
          {form()}
        </>
      ) : app && app.status === "approved" ? (
        <StatusCard icon={<CheckCircle2 className="h-6 w-6 text-feel" />} title="You're on the team"
          body="Your application was approved. Head to the moderator console to get started." tone="border-feel/25 bg-feel/[0.05]" />
      ) : (
        <>
          <div className="mb-5 grid gap-2.5 sm:grid-cols-2">
            <Perk icon={<Award className="h-4 w-4 text-aqua-200" />} title="Earn rewards" body="Every action earns credits toward cosmetic perks." />
            <Perk icon={<Heart className="h-4 w-4 text-wild" />} title="Shape the culture" body="Protect a platform built for real discovery." />
          </div>
          {form()}
        </>
      )}
    </div>
  );

  function form() {
    return (
      <form onSubmit={submit} className="space-y-3">
        <Field label="Why do you want to help moderate VYBZ? *">
          <textarea value={pitch} onChange={(e) => setPitch(e.target.value)} rows={4} required
            placeholder="Tell us what draws you to VYBZ and how you'd help keep it a healthy, creative space…" className={inputCls} />
        </Field>
        <Field label="Relevant experience (optional)">
          <textarea value={experience} onChange={(e) => setExperience(e.target.value)} rows={2}
            placeholder="Community management, Discord/forum mod, etc." className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hours / week">
            <input value={hours} onChange={(e) => setHours(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="5" className={inputCls} />
          </Field>
          <Field label="Timezone">
            <input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="e.g. PST / GMT+1" className={inputCls} />
          </Field>
        </div>
        {err && <p className="text-xs font-medium text-wild">{err}</p>}
        <button type="submit" disabled={busy || pitch.trim().length < 20} className="btn btn-primary w-full py-3.5 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit application"}
        </button>
        <p className="text-center text-[11px] text-white/35">Moderators can review reports and moderate content, but cannot access member data or admin controls.</p>
      </form>
    );
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[13px] font-medium text-white/70">{label}</span>{children}</label>;
}
function Perk({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-white/8 bg-white/[0.03] p-3.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div><p className="text-sm font-semibold text-white">{title}</p><p className="text-[12px] text-white/50">{body}</p></div>
    </div>
  );
}
function StatusCard({ icon, title, body, tone }: { icon: React.ReactNode; title: string; body: string; tone: string }) {
  return (
    <div className={`rounded-2xl border p-6 text-center ${tone}`}>
      <div className="mb-2 flex justify-center">{icon}</div>
      <p className="text-[15px] font-semibold text-white">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-white/55">{body}</p>
    </div>
  );
}
