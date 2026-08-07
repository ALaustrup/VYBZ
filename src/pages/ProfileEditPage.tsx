import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Camera, Check, Coins, Loader2, Navigation, Package } from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { ModuleAttrsEditor } from "@/components/ModuleAttrsEditor";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import {
  ROLES, ROLE_FAMILIES, GENRES, DAWS, PLUGINS, PROFESSIONS, PRIMARY_PROFESSION,
  INTERESTS, CHOICE_FIELDS, MAX_INTERESTS,
} from "@/lib/profileFields";
import { cx } from "@/lib/utils";
import type { ProfileDetails } from "@/types";

const LOOKING_FOR_OPTIONS = CHOICE_FIELDS.find((f) => f.key === "lookingFor")?.options ?? [];

/** V¢ packs — same Stripe products as StorePage (Law 6 utility credits). */
const CREDIT_PACKS = [
  { id: "starter", dollars: 5, credits: 100, label: "Starter" },
  { id: "plus", dollars: 10, credits: 200, label: "Plus" },
  { id: "pro", dollars: 25, credits: 500, label: "Studio" },
] as const;

export function ProfileEditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, refreshProfile, showToast } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const packagesRef = useRef<HTMLDivElement>(null);
  const moduleSaveRef = useRef<(() => Promise<void>) | null>(null);
  const [bio, setBio] = useState("");
  const [locationText, setLocationText] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [influences, setInfluences] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [openToWork, setOpenToWork] = useState(false);
  const [remoteOk, setRemoteOk] = useState(true);
  const [genres, setGenres] = useState<string[]>([]);
  const [daws, setDaws] = useState<string[]>([]);
  const [plugins, setPlugins] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [shareLocation, setShareLocation] = useState(true);
  const [offers, setOffers] = useState<string[]>([]);
  const [seeks, setSeeks] = useState<string[]>([]);
  const [profession, setProfession] = useState<string | null>(null);
  const [secondaries, setSecondaries] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [topupBusy, setTopupBusy] = useState<string | null>(null);
  const [vcBalance, setVcBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!profile) return;
    const f = profile.profile ?? {};
    setBio(profile.bio ?? ""); setLocationText(profile.location ?? "");
    setLat(profile.lat ?? null); setLng(profile.lng ?? null);
    setAvatarUrl(profile.avatarUrl); setInfluences(f.influences ?? "");
    setOpenToWork(!!f.openToWork); setRemoteOk(f.remoteOk ?? true);
    setGenres(f.genres ?? []); setDaws(f.daws ?? []); setPlugins(f.plugins ?? []);
    setInterests(f.interests ?? []); setLookingFor(f.lookingFor ?? []);
    setShareLocation(f.shareLocation !== false);
    setProfession(f.profession ?? null);
    setSecondaries((f.professions ?? []).filter((p) => p !== (f.profession ?? null)));
    api.getMyRoles().then((r) => { setOffers(r.offers.map((o) => o.roleId)); setSeeks(r.seeks.map((s) => s.roleId)); });
  }, [profile]);

  useEffect(() => {
    void api.listCosmetics().then((s) => setVcBalance(s?.credits ?? null)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (location.hash !== "#packages") return;
    const t = window.setTimeout(() => {
      packagesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(t);
  }, [location.hash]);

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

  function useMyLocation() {
    if (!navigator.geolocation) {
      showToast("Location not available on this device");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(Number(pos.coords.latitude.toFixed(5)));
        setLng(Number(pos.coords.longitude.toFixed(5)));
        setBusy(false);
        showToast("Location pin saved");
      },
      () => {
        setBusy(false);
        showToast("Couldn't read location — you can still enter a city");
      },
      { enableHighAccuracy: false, timeout: 12000 },
    );
  }

  async function buyCredits(packId: string) {
    setTopupBusy(packId);
    try {
      const url = await api.startCreditTopup(packId, window.location.origin);
      if (url) { window.location.href = url; return; }
      showToast("Could not start checkout.");
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setTopupBusy(null);
    }
  }

  async function save() {
    setBusy(true);
    const details: ProfileDetails = {
      ...(profile?.profile ?? {}),
      genres, daws, plugins, influences: influences.trim() || undefined, openToWork, remoteOk,
      interests, lookingFor,
      shareLocation,
      profession: profession ?? PRIMARY_PROFESSION,
      professions: [
        profession ?? PRIMARY_PROFESSION,
        ...secondaries.filter((p) => p !== (profession ?? PRIMARY_PROFESSION)),
      ],
    };
    await api.updateMyProfile({
      bio: bio.trim(),
      location: locationText.trim(),
      lat,
      lng,
      avatarUrl: avatarUrl ?? undefined,
      profile: details,
    });
    await api.setMyRoles(offers.map((r) => ({ roleId: r, skill: 3 })), seeks.map((r) => ({ roleId: r, priority: 1 })));
    try { await moduleSaveRef.current?.(); } catch { /* module attrs optional */ }
    void api.refreshEmbedding();
    void api.recordSocialScoreEvent("profile_save", { interests: interests.length, lookingFor: lookingFor.length });
    await refreshProfile();
    setBusy(false);
    showToast("Profile saved");
    navigate("/");
  }

  useRegisterAppBar({
    title: "Edit profile",
    actions: (
      <button type="button" onClick={() => void save()} disabled={busy} className="btn btn-primary h-9 px-4 py-0 text-sm">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
      </button>
    ),
  }, [busy]);

  return (
    <div className="flex h-full flex-col">
      <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-1 pb-10 pt-2">
        <Section title="Identity">
          <div className="flex items-center gap-4">
            <Avatar url={avatarUrl} name={profile?.username} id={profile?.id} size="lg" square />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white/50">A clear face or brand mark helps people recognise your releases.</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => void pickAvatar(e.target.files?.[0] ?? null)} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
                className="btn btn-ghost mt-2 h-9 px-3.5 py-0 text-[13px] disabled:opacity-50">
                <Camera className="h-3.5 w-3.5" /> {avatarUrl ? "Change photo" : "Upload photo"}
              </button>
            </div>
          </div>
          <input value={locationText} onChange={(e) => setLocationText(e.target.value.slice(0, 60))} placeholder="Location (city, region)" className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={useMyLocation} disabled={busy}
              className="btn btn-ghost h-9 px-3 py-0 text-[12px] disabled:opacity-50">
              <Navigation className="h-3.5 w-3.5" />
              {lat != null && lng != null ? "Update map pin" : "Use my location"}
            </button>
            {lat != null && lng != null && <span className="text-[11px] text-white/40">Pin set</span>}
          </div>
          <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 280))} rows={3} placeholder="Short bio — who you are and what you release" className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
          <textarea value={influences} onChange={(e) => setInfluences(e.target.value.slice(0, 200))} rows={2} placeholder="Influences (optional)" className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
        </Section>

        <div ref={packagesRef} id="packages">
          <Section title="Packages">
            <div className="flex items-start gap-2 text-[13px] leading-relaxed text-white/50">
              <Package className="mt-0.5 h-4 w-4 shrink-0 text-veil-300" />
              <p>
                Buy <span className="text-white/75">VYBZ Credits (V¢)</span> to tip and support artists on Discover.
                V¢ is closed-loop utility credit — not tradeable and not withdrawable.
              </p>
            </div>
            {vcBalance != null && (
              <p className="flex items-center gap-1.5 text-[13px] text-white/70">
                <Coins className="h-4 w-4 text-veil-300" /> Balance · {vcBalance} V¢
              </p>
            )}
            <div className="grid gap-2 sm:grid-cols-3">
              {CREDIT_PACKS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={!!topupBusy}
                  onClick={() => void buyCredits(p.id)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-left transition hover:border-white/25 hover:bg-white/[0.07] disabled:opacity-50"
                >
                  <p className="text-[13px] font-semibold text-white">{p.label}</p>
                  <p className="mt-1 font-mono text-[12px] text-veil-200">{p.credits} V¢</p>
                  <p className="mt-0.5 text-[11px] text-white/40">${p.dollars}</p>
                  {topupBusy === p.id ? (
                    <Loader2 className="mt-2 h-4 w-4 animate-spin text-white/50" />
                  ) : (
                    <span className="mt-2 inline-block text-[11px] font-semibold text-white/70">Buy</span>
                  )}
                </button>
              ))}
            </div>
          </Section>
        </div>

        <Section title="Presence">
          <Toggle label="Open to work / collaboration" on={openToWork} onClick={() => setOpenToWork((v) => !v)} />
          <Toggle label="Open to remote collaboration" on={remoteOk} onClick={() => setRemoteOk((v) => !v)} />
          <Toggle label="Show city on your profile" on={shareLocation} onClick={() => setShareLocation((v) => !v)} />
          <p className="pt-1 text-[11px] uppercase tracking-wide text-white/35">Interests</p>
          <div className="flex flex-wrap gap-1.5">
            {INTERESTS.map((g) => (
              <Chip key={g} label={g} on={interests.includes(g)} onClick={() => tog(interests, setInterests, g, MAX_INTERESTS)} />
            ))}
          </div>
          <p className="pt-1 text-[11px] uppercase tracking-wide text-white/35">Looking for</p>
          <div className="flex flex-wrap gap-1.5">
            {LOOKING_FOR_OPTIONS.map((g) => (
              <Chip
                key={g}
                label={g}
                on={lookingFor.includes(g)}
                onClick={() => tog(lookingFor, setLookingFor, g, 8)}
              />
            ))}
          </div>
        </Section>

        <Section title="Craft">
          <p className="text-[12px] text-white/40">Music is the default lane. Other crafts are optional secondaries.</p>
          <div className="flex flex-wrap gap-1.5">
            {PROFESSIONS.filter((p) => p.id === "music").map((p) => (
              <Chip
                key={p.id}
                label={p.label}
                on={profession === p.id || !profession}
                onClick={() => {
                  setProfession("music");
                  setSecondaries((s) => s.filter((x) => x !== "music"));
                }}
              />
            ))}
            {PROFESSIONS.filter((p) => p.id !== "music").map((p) => (
              <Chip
                key={p.id}
                label={p.label}
                on={profession === p.id}
                onClick={() => {
                  setProfession((cur) => (cur === p.id ? "music" : p.id));
                  setSecondaries((s) => s.filter((x) => x !== p.id));
                }}
              />
            ))}
          </div>
          <p className="pt-1 text-[11px] uppercase tracking-wide text-white/35">Also work in (optional)</p>
          <div className="flex flex-wrap gap-1.5">
            {PROFESSIONS.filter((p) => p.id !== (profession ?? "music")).map((p) => (
              <Chip
                key={p.id}
                label={p.label}
                on={secondaries.includes(p.id)}
                onClick={() => tog(secondaries, setSecondaries, p.id, 3)}
              />
            ))}
          </div>
        </Section>

        <Section title="I bring (roles you offer)">
          {ROLE_FAMILIES.map((fam) => (
            <div key={fam.id} className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wide text-white/35">{fam.label}</p>
              <Chips options={ROLES.filter((r) => r.family === fam.id)} selected={offers} onToggle={(id) => tog(offers, setOffers, id)} />
            </div>
          ))}
        </Section>

        <Section title="Looking for (roles you seek)">
          {ROLE_FAMILIES.map((fam) => (
            <div key={fam.id} className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wide text-white/35">{fam.label}</p>
              <Chips options={ROLES.filter((r) => r.family === fam.id)} selected={seeks} onToggle={(id) => tog(seeks, setSeeks, id)} />
            </div>
          ))}
        </Section>

        <Section title="Discipline details">
          <p className="text-[12px] text-white/40">Optional for art / video / games secondaries — software, styles, engines.</p>
          <ModuleAttrsEditor offerRoleIds={offers} saveRef={moduleSaveRef} />
        </Section>

        <Section title="Genres">
          <div className="flex flex-wrap gap-1.5">{GENRES.map((g) => <Chip key={g} label={g} on={genres.includes(g)} onClick={() => tog(genres, setGenres, g, 8)} />)}</div>
        </Section>
        <Section title="DAWs">
          <div className="flex flex-wrap gap-1.5">{DAWS.map((d) => <Chip key={d.id} label={d.label} on={daws.includes(d.id)} onClick={() => tog(daws, setDaws, d.id)} />)}</div>
        </Section>
        <Section title="Plugins">
          <div className="flex flex-wrap gap-1.5">{PLUGINS.map((p) => <Chip key={p.id} label={p.label} on={plugins.includes(p.id)} onClick={() => tog(plugins, setPlugins, p.id, 20)} />)}</div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="forge-card space-y-2.5"><p className="eyebrow">{title}</p>{children}</div>;
}
function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between border-b border-[var(--hairline)] py-3 text-left text-sm text-white/75 last:border-0">
      {label}
      <span className={cx("relative h-6 w-11 rounded-full transition-colors", on ? "bg-veil-500" : "bg-white/15")}><span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} /></span>
    </button>
  );
}
function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition active:scale-95",
        on ? "bg-veil-500/20 text-white ring-1 ring-veil-400/40" : "bg-white/[0.03] text-white/45 hover:text-white/70",
      )}
    >
      {on && <Check className="h-3 w-3" />}{label}
    </button>
  );
}
function Chips({ options, selected, onToggle }: { options: { id: string; label: string }[]; selected: string[]; onToggle: (id: string) => void }) {
  return <div className="flex flex-wrap gap-1.5">{options.map((o) => <Chip key={o.id} label={o.label} on={selected.includes(o.id)} onClick={() => onToggle(o.id)} />)}</div>;
}
