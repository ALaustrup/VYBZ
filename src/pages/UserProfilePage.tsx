import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useResolvedCosmetics } from "@/lib/cosmetics";
import * as api from "@/lib/api";
import { useSession } from "@/store/session";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { formatVcAddress } from "@/lib/vc";
import { openFreeDm } from "@/lib/freeConnect";
import { useMessagePopout } from "@/lib/messagePopout";
import { FLAGS } from "@/lib/flags";
import { ArtistStageProfile } from "@/features/profile/ArtistStageProfile";
import { listHostStageNights, type StageNight } from "@/features/profile/stageNights";
import type { StorefrontPackPublic } from "@/features/storefront/types";
import type { Drop, CreatorStats, Credit } from "@/types";

/** Public artist stage — live nights first, catalog and credits still here. */
export function UserProfilePage() {
  const { id = "" } = useParams();
  const { userId, showToast } = useSession();
  const { openThread } = useMessagePopout();
  const [p, setP] = useState<api.PublicProfile | null>(null);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [nights, setNights] = useState<StageNight[]>([]);
  const [packs, setPacks] = useState<StorefrontPackPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"follow" | "msg" | "book" | null>(null);
  const [requested, setRequested] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.getPublicProfile(id),
      api.dropsBy(id, 40),
      api.getCreatorStats(id),
      api.creatorCredits(id),
      listHostStageNights(id, 24),
      FLAGS.storefront
        ? api.listPublishedStorefrontPacks(48).then((all) => all.filter((x) => x.user_id === id)).catch(() => [])
        : Promise.resolve([] as StorefrontPackPublic[]),
    ]).then(([prof, d, s, c, nightsList, packList]) => {
      if (!alive) return;
      setP(prof);
      setDrops(d);
      setStats(s);
      setCredits(c);
      setNights(nightsList);
      setPacks(packList);
      setLoading(false);
    }).catch(() => {
      if (alive) setLoading(false);
    });
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    const t = searchParams.get("tip");
    if (t === "success") showToast("Thanks for the tip!");
    if (t === "success" || t === "cancel") {
      searchParams.delete("tip");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const addr = formatVcAddress(p?.username);
  const liveNow = nights.some((n) => n.status === "live");
  useRegisterAppBar({
    title: addr || "Artist",
    subtitle: liveNow ? "Live now" : (p?.profile?.roleLabel || "Music"),
  }, [addr, p?.profile?.roleLabel, liveNow]);

  const cosmetics = useResolvedCosmetics(p?.equippedCosmetics);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>;
  }
  if (!p) {
    return <div className="flex h-full items-center justify-center text-white/50">Profile not found.</div>;
  }

  const profile = p;

  async function follow() {
    if (busy) return;
    setBusy("follow");
    const ok = await api.connect(id);
    setBusy(null);
    if (!ok) {
      showToast("Couldn't send the request");
      return;
    }
    setRequested(true);
    showToast(`Request sent to ${addr || profile.username || "artist"}`);
  }

  async function message() {
    if (busy) return;
    setBusy("msg");
    const ok = await openFreeDm(id, openThread);
    setBusy(null);
    if (!ok) showToast("Couldn't open message");
  }

  async function book() {
    if (busy) return;
    setBusy("book");
    const ok = await openFreeDm(id, openThread);
    setBusy(null);
    if (!ok) {
      showToast("Couldn't open message");
      return;
    }
    showToast("Tell them when you want to book. This is not a calendar.");
  }

  return (
    <ArtistStageProfile
      id={id}
      profile={profile}
      drops={drops}
      stats={stats}
      credits={credits}
      nights={nights}
      packs={packs}
      cosmetics={cosmetics}
      isMe={userId === id}
      requested={requested}
      busy={busy}
      onConnect={() => void follow()}
      onMessage={() => void message()}
      onBook={() => void book()}
    />
  );
}
