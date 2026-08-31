import { useNavigate } from "react-router-dom";
import { Avatar } from "@/components/Avatar";
import { useSession } from "@/store/session";
import { CosmeticAvatarShell, Flair, useResolvedCosmetics } from "@/lib/cosmetics";
import { ownerProfilePath } from "@/shell/navModel";

/**
 * Rail head — who you are. Alerts live once, in the top chrome.
 */
export function RailIdentity() {
  const { profile, userId } = useSession();
  const navigate = useNavigate();
  const cosmetics = useResolvedCosmetics(profile?.equippedCosmetics);

  const name = profile?.displayName?.trim() || profile?.username?.trim() || "You";
  const handle = profile?.username?.trim() ? `@${profile.username.trim()}` : null;
  const role = profile?.profile?.roleLabel?.trim() || null;

  return (
    <div className="suite-rail-ops-head" data-testid="rail-identity">
      <div className="flex items-start gap-2.5 px-1">
        <button
          type="button"
          onClick={() => navigate(ownerProfilePath(userId))}
          className="shrink-0 rounded-2xl outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/25"
          aria-label="My VYBZ"
        >
          <CosmeticAvatarShell accent={cosmetics.accent} frame={cosmetics.frame}>
            <Avatar url={profile?.avatarUrl} name={name} id={profile?.id} size="sm" square />
          </CosmeticAvatarShell>
        </button>
        <button
          type="button"
          onClick={() => navigate(ownerProfilePath(userId))}
          className="min-w-0 flex-1 pt-0.5 text-left outline-none"
          aria-label="My VYBZ"
        >
          <div className="flex items-center gap-1">
            <p className="truncate font-display text-[13px] font-semibold tracking-tight text-white">
              {name}
            </p>
            <Flair data={cosmetics.flair} className="!px-1.5 !py-0 !text-[9px]" />
          </div>
          {handle ? (
            <p className="truncate font-mono text-[11px] text-white/40">{handle}</p>
          ) : null}
          {role ? (
            <p className="mt-0.5 truncate text-[10px] text-white/30">{role}</p>
          ) : null}
        </button>
      </div>
    </div>
  );
}
