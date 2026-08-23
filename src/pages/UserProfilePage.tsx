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
import { isVisitorPreview } from "@/features/profile/perspective";
import { applyDropComposition, parseStageComposition } from "@/features/profile/stageComposition";
import { listCreationSessionLinks } from "@/features/provenance/provenanceApi";
import type { WorkSessionLink } from "@/features/provenance/workAttestation";
import { listHostStageNights, type StageNight } from "@/features/profile/stageNights";
import type { StorefrontPackPublic } from "@/features/storefront/types";
import type { Credit, CreatorStats, Drop, ProfileProject, ProjectLink, ProjectPost } from "@/types";

/** Signed-in home — the owner's VYBZ, same Stage File as `/u/:id`. */
export function MyVybzHome() {
  const { userId } = useSession();
  if (!userId) return null;
  return <UserProfilePage id={userId} />;
}

/** Public Stage File — live nights first, then works of any kind. */
export function UserProfilePage({ id: idProp }: { id?: string } = {}) {
  const { id: paramId = "" } = useParams();
  const id = idProp || paramId;
  const { userId, showToast, profile: me } = useSession();
  const { openThread } = useMessagePopout();
  const [p, setP] = useState<api.PublicProfile | null>(null);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [nights, setNights] = useState<StageNight[]>([]);
  const [packs, setPacks] = useState<StorefrontPackPublic[]>([]);
  const [projects, setProjects] = useState<ProfileProject[]>([]);
  const [posts, setPosts] = useState<ProjectPost[]>([]);
  const [projectLinks, setProjectLinks] = useState<ProjectLink[]>([]);
  const [sessionLinks, setSessionLinks] = useState<WorkSessionLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"connect" | "msg" | "book" | null>(null);
  const [requested, setRequested] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
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
      api.listProfileProjects(id).catch(() => [] as ProfileProject[]),
      listCreationSessionLinks(id).catch(() => [] as WorkSessionLink[]),
    ]).then(async ([prof, d, s, c, nightsList, packList, projectList, linkList]) => {
      const details = await Promise.all(
        projectList.slice(0, 8).map((project) => api.getProjectDetail(project.id).catch(() => null)),
      );
      if (!alive) return;
      setP(prof);
      const composition = parseStageComposition(prof?.profile);
      let catalog = d;
      if (composition.selected && composition.placements.length > catalog.length) {
        catalog = await api.dropsBy(id, 200);
      }
      if (!alive) return;
      setDrops(applyDropComposition(catalog, composition, userId === id ? (me?.featuredDropId ?? null) : null));
      setStats(s);
      setCredits(c);
      setNights(nightsList);
      setPacks(packList);
      setProjects(projectList);
      setPosts(details.flatMap((detail) => detail?.posts ?? []));
      setProjectLinks(details.flatMap((detail) => detail?.links ?? []));
      setSessionLinks(linkList);
      setLoading(false);
    }).catch(() => {
      if (alive) setLoading(false);
    });
    return () => { alive = false; };
  }, [id, userId, me?.featuredDropId]);

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
  const isOwner = !!userId && userId === id;
  const previewAsVisitor = isOwner && isVisitorPreview(searchParams.get("view"));

  function setVisitorPreview(on: boolean) {
    const next = new URLSearchParams(searchParams);
    if (on) next.set("view", "visitor");
    else next.delete("view");
    setSearchParams(next, { replace: true });
  }

  useRegisterAppBar({
    title: addr || "Creator",
    subtitle: liveNow ? "Live now" : (p?.profile?.roleLabel || "Creator"),
  }, [addr, p?.profile?.roleLabel, liveNow]);

  const cosmetics = useResolvedCosmetics(p?.equippedCosmetics);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>;
  }
  if (!p) {
    return <div className="flex h-full items-center justify-center text-white/50">Profile not found.</div>;
  }

  const profile = p;

  async function connect() {
    if (busy) return;
    setBusy("connect");
    const ok = await api.connect(id);
    setBusy(null);
    if (!ok) {
      showToast("Couldn't send the request");
      return;
    }
    setRequested(true);
    showToast(`Request sent to ${addr || profile.username || "creator"}`);
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
      projects={projects}
      posts={posts}
      projectLinks={projectLinks}
      sessionLinks={sessionLinks}
      cosmetics={cosmetics}
      isMe={isOwner}
      previewAsVisitor={previewAsVisitor}
      featuredDropId={userId === id ? (me?.featuredDropId ?? null) : null}
      requested={requested}
      busy={busy}
      onConnect={() => void connect()}
      onMessage={() => void message()}
      onBook={() => void book()}
      onViewAsVisitor={() => setVisitorPreview(true)}
      onExitVisitorPreview={() => setVisitorPreview(false)}
    />
  );
}
