import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Check, Loader2 } from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { ROLES, ROLE_FAMILIES, GENRES, DAWS, PLUGINS } from "@/lib/profileFields";
import { cx } from "@/lib/utils";
import type { ProfileDetails } from "@/types";

export function ProfileEditPage() {
  const navigate = useNavigate();
  const { profile, refreshProfile, showToast } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [influences, setInfluences] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [openToWork, setOpenToWork] = useState(false);
  const [remoteOk, setRemoteOk] = useState(true);
  const [genres, setGenres] = useState<string[]>([]);
  const [daws, setDaws] = useState<string[]>([]);
  const [plugins, setPlugins] = useState<string[]>([]);
  const [offers, setOffers] = useState<string[]>([]);
  const [seeks, setSeeks] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const f = profile.profile ?? {};
    setBio(profile.bio ?? ""); setLocation(profile.location ?? "");
    setAvatarUrl(profile.avatarUrl); setInfluences(f.influences ?? "");
    setOpenToWork(!!f.openToWork); setRemoteOk(f.remoteOk ?? true);
    setGenres(f.genres ?? []); setDaws(f.daws ?? []); setPlugins(f.plugins ?? []);
    api.getMyRoles().then((r) => { setOffers(r.offers.map((o) => o.roleId)); setSeeks(r.seeks.map((s) => s.roleId)); });
  }, [profile]);

  const tog = (arr: string[], set: (v: string[]) => void, v: string, max = 99) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v].slice(0, max));

  async function pickAvatar(file: File | null) {
    if (!file || !file.type.startsWith("image/")) return;
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
      const url = await api.uploadAvatar(file, ext);
      if (url) {
        setAvatarUrl(url);
        await api.updateMyProfile({ avatarUrl: url });
        await refreshProfile();
        showToast("Photo updated");
      } else {
        showToast("Couldn't upload that photo");
      }
    } finally { setBusy(false); }
  }

  async function save() {
    setBusy(true);
    const details: ProfileDetails = {
      ...(profile?.profile ?? {}),
      genres, daws, plugins, influences: influences.trim() || undefined, openToWork, remoteOk,
    };
    await api.updateMyProfile({ bio: bio.trim(), location: location.trim(), avatarUrl: avatarUrl ?? undefined, profile: details });
    await api.setMyRoles(offers.map((r) => ({ roleId: r, skill: 3 })), seeks.map((r) => ({ roleId: r, priority: 1 })));
    void api.refreshEmbedding(); // update semantic resonance vector (async, non-blocking)
    await refreshProfile();
    setBusy(false);
    showToast("Profile saved");
    navigate("/profile");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 pb-1 pt-3">
        <button onClick={() => navigate("/profile")} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"><ArrowLeft className="h-4 w-4" /></button>
        <h1 className="flex-1 font-display text-xl font-bold text-gradient">Edit profile</h1>
        <button onClick={save} disabled={busy} className="btn btn-primary h-9 px-4 py-0 text-sm">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</button>
      </div>
      <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-4 pb-10 pt-3">
        <Section title="Photo">
          <div className="flex items-center gap-4">
            <Avatar url={avatarUrl} name={profile?.username} id={profile?.id} size="lg" square />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white/65">A clear face or brand mark helps people recognize you in Connect & Spark.</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => void pickAvatar(e.target.files?.[0] ?? null)} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
                className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3.5 py-2 text-[13px] font-semibold text-white/80 ring-1 ring-white/10 hover:text-white active:scale-95 disabled:opacity-50">
                <Camera className="h-3.5 w-3.5" /> {avatarUrl ? "Change photo" : "Upload photo"}
              </button>
            </div>
          </div>
        </Section>

        <Section title="About">
          <input value={location} onChange={(e) => setLocation(e.target.value.slice(0, 60))} placeholder="Location (city, region)" className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
          <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 280))} rows={3} placeholder="Short bio — who you are as a creator" className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
          <textarea value={influences} onChange={(e) => setInfluences(e.target.value.slice(0, 200))} rows={2} placeholder="Influences (e.g. Dilla, Hiatus Kaiyote, D'Angelo) — powers resonance matching" className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
          <Toggle label="Open to work / collaboration" on={openToWork} onClick={() => setOpenToWork((v) => !v)} />
          <Toggle label="Open to remote collaboration" on={remoteOk} onClick={() => setRemoteOk((v) => !v)} />
        </Section>

        <Section title="I bring (roles you offer)">
          {ROLE_FAMILIES.map((fam) => (
            <div key={fam.id} className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wide text-white/35">{fam.label}</p>
              <Chips options={ROLES.filter((r) => r.family === fam.id)} selected={offers} onToggle={(id) => tog(offers, setOffers, id)} tone="feel" />
            </div>
          ))}
        </Section>

        <Section title="Looking for (roles you seek)">
          {ROLE_FAMILIES.map((fam) => (
            <div key={fam.id} className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wide text-white/35">{fam.label}</p>
              <Chips options={ROLES.filter((r) => r.family === fam.id)} selected={seeks} onToggle={(id) => tog(seeks, setSeeks, id)} tone="aqua" />
            </div>
          ))}
        </Section>

        <Section title="Genres">
          <div className="flex flex-wrap gap-1.5">{GENRES.map((g) => <Chip key={g} label={g} on={genres.includes(g)} onClick={() => tog(genres, setGenres, g, 8)} tone="veil" />)}</div>
        </Section>
        <Section title="DAWs">
          <div className="flex flex-wrap gap-1.5">{DAWS.map((d) => <Chip key={d.id} label={d.label} on={daws.includes(d.id)} onClick={() => tog(daws, setDaws, d.id)} tone="veil" />)}</div>
        </Section>
        <Section title="Plugins">
          <div className="flex flex-wrap gap-1.5">{PLUGINS.map((p) => <Chip key={p.id} label={p.label} on={plugins.includes(p.id)} onClick={() => tog(plugins, setPlugins, p.id, 20)} tone="veil" />)}</div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-2.5"><p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">{title}</p>{children}</div>;
}
function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-3 text-left text-sm text-white/80">
      {label}
      <span className={cx("relative h-6 w-11 rounded-full transition-colors", on ? "bg-veil-500" : "bg-white/15")}><span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} /></span>
    </button>
  );
}
const TONES: Record<string, [string, string]> = {
  feel: ["bg-feel/20 text-feel ring-1 ring-feel/50", "bg-white/[0.04] text-white/55"],
  aqua: ["bg-aqua-400/20 text-aqua-200 ring-1 ring-aqua-400/50", "bg-white/[0.04] text-white/55"],
  veil: ["bg-veil-500/30 text-white ring-1 ring-veil-400/50", "bg-white/[0.04] text-white/55"],
};
function Chip({ label, on, onClick, tone }: { label: string; on: boolean; onClick: () => void; tone: string }) {
  return <button type="button" onClick={onClick} className={cx("flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition active:scale-95", on ? TONES[tone][0] : TONES[tone][1])}>{on && <Check className="h-3 w-3" />}{label}</button>;
}
function Chips({ options, selected, onToggle, tone }: { options: { id: string; label: string }[]; selected: string[]; onToggle: (id: string) => void; tone: string }) {
  return <div className="flex flex-wrap gap-1.5">{options.map((o) => <Chip key={o.id} label={o.label} on={selected.includes(o.id)} onClick={() => onToggle(o.id)} tone={tone} />)}</div>;
}
