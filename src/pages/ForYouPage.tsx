import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { WhisperCard } from "@/components/WhisperCard";
import { PullToRefresh } from "@/components/PullToRefresh";
import { EmptyState } from "@/components/EmptyState";
import { useApp } from "@/store/AppStore";
import { fetchForYou } from "@/lib/backend";
import type { Confession } from "@/types";

function ForYouHeader() {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-3 px-4 pb-1 pt-3">
      <button
        onClick={() => navigate("/profile")}
        aria-label="Back"
        className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <h1 className="font-display text-xl font-bold text-gradient">For You</h1>
    </div>
  );
}

/**
 * "For You" — the Vyb affinity feed. Co-Vyb collaborative filtering surfaces
 * confessions vybed by people who vyb what you vyb; your Fails are excluded.
 * Transparent and reversible: it's shaped purely by your explicit Vyb/Fail.
 */
export function ForYouPage() {
  const { displayLevel, isNsfwHidden, isHidden, openPost, backendEnabled } = useApp();
  const [posts, setPosts] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const list = await fetchForYou(48);
    setPosts(list.filter((c) => !isHidden(c.id)));
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchForYou(48).then((list) => {
      if (cancelled) return;
      setPosts(list.filter((c) => !isHidden(c.id)));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <ForYouHeader />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-veil-300" />
        </div>
      </div>
    );
  }

  if (!backendEnabled || posts.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <ForYouHeader />
        <div className="px-4 pt-6">
          <EmptyState
            icon={Sparkles}
            title="Your feed is forming"
            body="Vyb the confessions you love — your For You feed grows around what you vyb, and quietly drops what you Fail."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ForYouHeader />
      <p className="flex items-center gap-1.5 px-4 pt-2 text-[11px] text-white/40">
        <Sparkles className="h-3.5 w-3.5 text-veil-300" />
        Shaped by what you Vyb · Fails are hidden
      </p>
      <PullToRefresh onRefresh={load} className="flex-1 px-4 pb-6 pt-3">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {posts.map((c) => (
            <WhisperCard
              key={c.id}
              confession={c}
              level={displayLevel(c)}
              nsfwHidden={isNsfwHidden(c)}
              variant="tile"
              paused
              onClick={() => openPost(c.id)}
            />
          ))}
        </div>
      </PullToRefresh>
    </div>
  );
}
