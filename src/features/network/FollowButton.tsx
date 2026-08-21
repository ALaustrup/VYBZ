import { useEffect, useState } from "react";
import { Loader2, UserCheck, UserPlus } from "lucide-react";
import { useSession } from "@/store/session";
import { canFollowCreator } from "./follow";
import { followCreator, isFollowingCreator, unfollowCreator } from "./followApi";

export function FollowButton({
  creatorId,
  className,
}: {
  creatorId: string;
  className?: string;
}) {
  const { userId, showToast } = useSession();
  const [on, setOn] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const eligible = canFollowCreator({ viewerId: userId ?? null, creatorId });

  useEffect(() => {
    if (!eligible.ok) {
      setReady(true);
      setOn(false);
      return;
    }
    let alive = true;
    void isFollowingCreator(creatorId).then((next) => {
      if (alive) {
        setOn(next);
        setReady(true);
      }
    });
    return () => {
      alive = false;
    };
  }, [creatorId, eligible.ok]);

  if (!eligible.ok) return null;

  async function toggle() {
    if (busy || !ready) return;
    setBusy(true);
    const ok = on ? await unfollowCreator(creatorId) : await followCreator(creatorId);
    setBusy(false);
    if (!ok) {
      showToast(on ? "Couldn't unfollow" : "Couldn't follow");
      return;
    }
    setOn(!on);
  }

  return (
    <button
      type="button"
      disabled={busy || !ready}
      onClick={() => void toggle()}
      data-testid="profile-follow"
      className={className ?? "btn btn-ghost h-10 flex-1 py-0 text-xs sm:flex-none sm:px-4"}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : on ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
      {on ? "Following" : "Follow"}
    </button>
  );
}
