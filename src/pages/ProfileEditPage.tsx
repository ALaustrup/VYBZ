import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Check, Loader2, Navigation } from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { ModuleAttrsEditor } from "@/components/ModuleAttrsEditor";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import {
  ROLES, ROLE_FAMILIES, GENRES, DAWS, PLUGINS, PROFESSIONS, PRIMARY_PROFESSION,
  INTERESTS, MEETUP_INTENTS, SEX_OPTIONS, CHOICE_FIELDS, MAX_INTERESTS,
  hasRomanticLookingFor, isAdultBirthYear, ageFromBirthYear,
} from "@/lib/profileFields";
import { resolveIntentMix, showCreateFacets, sealIntentMixPrivacy } from "@/lib/intentMix";
import { cx } from "@/lib/utils";
import type { ProfileDetails } from "@/types";

const LOOKING_FOR_OPTIONS = CHOICE_FIELDS.find((f) => f.key === "lookingFor")?.options ?? [];

export function ProfileEditPage() {
  const navigate = useNavigate();
  const { profile, refreshProfile, showToast } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const moduleSaveRef = useRef<(() => Promise<void>) | null>(null);
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
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
  const [meetupIntents, setMeetupIntents] = useState<string[]>([]);
  const [birthYear, setBirthYear] = useState("");
  const [sex, setSex] = useState("");
  const [matchRadiusMiles, setMatchRadiusMiles] = useState(100);
  const [prefAgeMin, setPrefAgeMin] = useState("");
  const [prefAgeMax, setPrefAgeMax] = useState("");
  const [shareAge, setShareAge] = useState(false);
  const [shareSex, setShareSex] = useState(false);
  const [shareLocation, setShareLocation] = useState(true);
  const [offers, setOffers] = useState<string[]>([]);
  const [seeks, setSeeks] = useState<string[]>([]);
  const [profession, setProfession] = useState<string | null>(null);
  const [secondaries, setSecondaries] = useState<string[]>([]);
  const [createExpanded, setCreateExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const f = profile.profile ?? {};
    setBio(profile.bio ?? ""); setLocation(profile.location ?? "");
    setLat(profile.lat ?? null); setLng(profile.lng ?? null);
    setAvatarUrl(profile.avatarUrl); setInfluences(f.influences ?? "");
    setOpenToWork(!!f.openToWork); setRemoteOk(f.remoteOk ?? true);
    setGenres(f.genres ?? []); setDaws(f.daws ?? []); setPlugins(f.plugins ?? []);
    setInterests(f.interests ?? []); setLookingFor(f.lookingFor ?? []);
    setMeetupIntents(f.meetupIntents ?? []);
    setBirthYear(f.birthYear ? String(f.birthYear) : "");
    setSex(f.sex ?? "");
    setMatchRadiusMiles(f.matchRadiusMiles ?? 100);
    setPrefAgeMin(f.prefAgeMin != null ? String(f.prefAgeMin) : "");
    setPrefAgeMax(f.prefAgeMax != null ? String(f.prefAgeMax) : "");
    setShareAge(!!f.shareAge); setShareSex(!!f.shareSex);
    setShareLocation(f.shareLocation !== false);
    setProfession(f.profession ?? null);
    setSecondaries((f.professions ?? []).filter((p) => p !== (f.profession ?? null)));
    setCreateExpanded(!!resolveIntentMix(f).createExpanded || showCreateFacets(f));
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
        showToast("Location pin saved — used only for nearby matches");
      },
      () => {
        setBusy(false);
        showToast("Couldn't read location — you can still match by city");
      },
      { enableHighAccuracy: false, timeout: 12000 },
    );
  }

  async function save() {
    const year = birthYear.trim() ? Number(birthYear.trim()) : undefined;
    if (hasRomanticLookingFor(lookingFor) && !isAdultBirthYear(year)) {
      showToast("Romantic intents require birth year proving 18+");
      return;
    }
    setBusy(true);
    const amin = prefAgeMin.trim() ? Number(prefAgeMin.trim()) : undefined;
    const amax = prefAgeMax.trim() ? Number(prefAgeMax.trim()) : undefined;
    const prevMix = resolveIntentMix(profile?.profile);
    const details: ProfileDetails = {
      ...(profile?.profile ?? {}),
      genres, daws, plugins, influences: influences.trim() || undefined, openToWork, remoteOk,
      interests, lookingFor, meetupIntents,
      birthYear: year && year >= 1920 && year <= new Date().getFullYear() ? year : undefined,
      sex: sex.trim() || undefined,
      matchRadiusMiles,
      prefAgeMin: amin != null && amin >= 18 && amin <= 99 ? amin : undefined,
      prefAgeMax: amax != null && amax >= 18 && amax <= 99 ? amax : undefined,
      shareAge, shareSex, shareLocation,
      profession: profession ?? PRIMARY_PROFESSION,
      professions: [
        profession ?? PRIMARY_PROFESSION,
        ...secondaries.filter((p) => p !== (profession ?? PRIMARY_PROFESSION)),
      ],
      intentMix: {
        ...prevMix,
        createExpanded: createExpanded || prevMix.pillars.includes("create"),
        completedAt: prevMix.completedAt ?? new Date().toISOString(),
      },
    };
    await api.updateMyProfile({
      bio: bio.trim(),
      location: location.trim(),
      lat,
      lng,
      avatarUrl: avatarUrl ?? undefined,
      profile: sealIntentMixPrivacy(details),
    });
    await api.setMyRoles(offers.map((r) => ({ roleId: r, skill: 3 })), seeks.map((r) => ({ roleId: r, priority: 1 })));
    try { await moduleSaveRef.current?.(); } catch { /* module attrs optional */ }
    void api.refreshEmbedding();
    void api.recordSocialScoreEvent("profile_save", { interests: interests.length, lookingFor: lookingFor.length });
    await refreshProfile();
    setBusy(false);
    showToast("Profile saved — matching updates as you share");
    navigate("/profile");
  }

  useRegisterAppBar({
    actions: (
      <button type="button" onClick={save} disabled={busy} className="btn btn-primary h-9 px-4 py-0 text-sm">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
      </button>
    ),
  }, [busy]);

  return (
    <div className="flex h-full flex-col">
      <div className="no-scrollbar flex-1 space-y-6 overflow-y-auto px-1 pb-10 pt-2">
        <Section title="Photo">
          <div className="flex items-center gap-4">
            <Avatar url={avatarUrl} name={profile?.username} id={profile?.id} size="lg" square />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white/50">A clear face or brand mark helps people recognize you in Network &amp; Spark.</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => void pickAvatar(e.target.files?.[0] ?? null)} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
                className="btn btn-ghost mt-2 h-9 px-3.5 py-0 text-[13px] disabled:opacity-50">
                <Camera className="h-3.5 w-3.5" /> {avatarUrl ? "Change photo" : "Upload photo"}
              </button>
            </div>
          </div>
        </Section>

        <Section title="About">
          <input value={location} onChange={(e) => setLocation(e.target.value.slice(0, 60))} placeholder="Location (city, region)" className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={useMyLocation} disabled={busy}
              className="btn btn-ghost h-9 px-3 py-0 text-[12px] disabled:opacity-50">
              <Navigation className="h-3.5 w-3.5" />
              {lat != null && lng != null ? "Update map pin" : "Use my location"}
            </button>
            {lat != null && lng != null && (
              <span className="text-[11px] text-white/40">Pin set · radius {matchRadiusMiles} mi</span>
            )}
          </div>
          <label className="block text-[12px] text-white/45">
            Match radius (miles)
            <input
              type="range" min={10} max={250} step={5} value={matchRadiusMiles}
              onChange={(e) => setMatchRadiusMiles(Number(e.target.value))}
              className="mt-2 w-full accent-veil-400"
            />
          </label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 280))} rows={3} placeholder="Short bio — who you are, what you're into" className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
          <textarea value={influences} onChange={(e) => setInfluences(e.target.value.slice(0, 200))} rows={2} placeholder="Influences (optional) — powers creative resonance" className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
          <Toggle label="Open to work / collaboration" on={openToWork} onClick={() => setOpenToWork((v) => !v)} />
          <Toggle label="Open to remote collaboration" on={remoteOk} onClick={() => setRemoteOk((v) => !v)} />
          <Toggle label="Show city on vibe cards" on={shareLocation} onClick={() => setShareLocation((v) => !v)} />
        </Section>

        <Section title="Vibes">
          <p className="text-[12px] text-white/40">Share what you want — matching can begin as soon as there is signal. Never paywalled.</p>
          <p className="text-[11px] uppercase tracking-wide text-white/35">Interests</p>
          <div className="flex flex-wrap gap-1.5">
            {INTERESTS.map((g) => (
              <Chip key={g} label={g} on={interests.includes(g)} onClick={() => tog(interests, setInterests, g, MAX_INTERESTS)} tone="veil" />
            ))}
          </div>
          <p className="pt-1 text-[11px] uppercase tracking-wide text-white/35">Looking for</p>
          <div className="flex flex-wrap gap-1.5">
            {LOOKING_FOR_OPTIONS.map((g) => (
              <Chip
                key={g}
                label={g}
                on={lookingFor.includes(g)}
                onClick={() => {
                  if (!lookingFor.includes(g) && hasRomanticLookingFor([g]) && !isAdultBirthYear(birthYear.trim() ? Number(birthYear) : undefined)) {
                    showToast("Set birth year (18+) before Dating / Something casual");
                    return;
                  }
                  tog(lookingFor, setLookingFor, g, 8);
                }}
                tone="veil"
              />
            ))}
          </div>
          {hasRomanticLookingFor(lookingFor) && (
            <p className="text-[11px] text-feel/80">
              Romantic intents require 18+
              {ageFromBirthYear(birthYear.trim() ? Number(birthYear) : undefined) != null
                ? ` · you are ${ageFromBirthYear(Number(birthYear))}`
                : " · add birth year below"}
            </p>
          )}
          <p className="pt-1 text-[11px] uppercase tracking-wide text-white/35">Meetup vibes</p>
          <div className="flex flex-wrap gap-1.5">
            {MEETUP_INTENTS.map((g) => (
              <Chip key={g} label={g} on={meetupIntents.includes(g)} onClick={() => tog(meetupIntents, setMeetupIntents, g, 6)} tone="veil" />
            ))}
          </div>
        </Section>

        <Section title="Identity details (optional)">
          <p className="text-[12px] text-white/40">Shown on vibe cards only when you opt in. Romantic intents require you to be 18+.</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="Birth year"
              inputMode="numeric"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none"
            />
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white focus:border-veil-400/60 focus:outline-none"
            >
              <option value="">Sex / presentation</option>
              {SEX_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={prefAgeMin}
              onChange={(e) => setPrefAgeMin(e.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="Prefer age min"
              inputMode="numeric"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none"
            />
            <input
              value={prefAgeMax}
              onChange={(e) => setPrefAgeMax(e.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="Prefer age max"
              inputMode="numeric"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none"
            />
          </div>
          <p className="text-[11px] text-white/35">Age preferences are private — never shown on your public profile.</p>
          <Toggle label="Show age on vibe cards" on={shareAge} onClick={() => setShareAge((v) => !v)} />
          <Toggle label="Show sex on vibe cards" on={shareSex} onClick={() => setShareSex((v) => !v)} />
        </Section>

        {!createExpanded ? (
          <Section title="Create">
            <p className="text-[12px] text-white/40">
              Craft, genres, and tools stay tucked away until you want them — connection first, Create when you&apos;re ready.
            </p>
            <button
              type="button"
              onClick={() => setCreateExpanded(true)}
              className="btn btn-ghost mt-1 w-full py-2.5 text-sm"
            >
              I also create
            </button>
          </Section>
        ) : (
          <>
            <Section title="Craft">
              <p className="text-[12px] text-white/40">Music is the default lane for Drops and Network. Other crafts are optional secondaries.</p>
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

            <Section title="Discipline details">
              <p className="text-[12px] text-white/40">Optional for art / video / games secondaries — software, styles, engines.</p>
              <ModuleAttrsEditor offerRoleIds={offers} saveRef={moduleSaveRef} />
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
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-2.5"><p className="eyebrow">{title}</p>{children}</div>;
}
function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between border-b border-[var(--hairline)] py-3 text-left text-sm text-white/75 last:border-0">
      {label}
      <span className={cx("relative h-6 w-11 rounded-full transition-colors", on ? "bg-veil-500" : "bg-white/15")}><span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} /></span>
    </button>
  );
}
function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void; tone?: string }) {
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
function Chips({ options, selected, onToggle, tone }: { options: { id: string; label: string }[]; selected: string[]; onToggle: (id: string) => void; tone: string }) {
  return <div className="flex flex-wrap gap-1.5">{options.map((o) => <Chip key={o.id} label={o.label} on={selected.includes(o.id)} onClick={() => onToggle(o.id)} tone={tone} />)}</div>;
}
