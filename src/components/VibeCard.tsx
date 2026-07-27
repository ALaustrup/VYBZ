import { useNavigate } from "react-router-dom";
import { ArrowRight, MapPin, Sparkles, Users } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { FreeConnectActions } from "@/components/FreeConnectActions";
import { cx } from "@/lib/utils";
import type { VibeCard as VibeCardData } from "@/types";

/** Genuine connection discovery card — never an ad or paid placement. */
export function VibeCardView({ card }: { card: VibeCardData }) {
  const navigate = useNavigate();
  const meta = [card.age != null ? String(card.age) : null, card.sex, card.location]
    .filter(Boolean)
    .join(" · ");
  const Icon = card.cardType === "nearby_intent" ? MapPin : Users;

  return (
    <div
      className={cx(
        "group flex w-full items-start gap-3 rounded-2xl border border-paper-900/10 bg-white/75 px-3.5 py-3.5 text-left",
        "shadow-[0_1px_0_rgba(28,25,23,0.04)] transition hover:border-coral-500/35 hover:bg-white",
      )}
    >
      <button type="button" onClick={() => navigate(`/u/${card.userId}`)} className="shrink-0">
        <Avatar url={card.avatarUrl} name={card.username ?? card.displayName} id={card.userId} size="md" square />
      </button>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={() => navigate(`/u/${card.userId}`)} className="w-full text-left">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-coral-600/90">
            <Icon className="h-3 w-3" />
            {card.cardType === "nearby_intent" ? "Nearby vibe" : "New on VYBZ"}
          </div>
          <p className="text-[14px] font-medium leading-snug text-paper-900">{card.headline}</p>
          {meta && <p className="mt-1 text-[12px] text-paper-900/55">{meta}</p>}
          {card.why && (
            <p className="mt-1.5 flex items-start gap-1 text-[11px] leading-snug text-paper-900/45">
              <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-coral-500/80" />
              <span>{card.why}</span>
            </p>
          )}
        </button>
        <FreeConnectActions peerId={card.userId} peerName={card.username} variant="card" />
        <button
          type="button"
          onClick={() => navigate(`/u/${card.userId}`)}
          className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-medium text-coral-600/80 transition hover:text-coral-600"
        >
          View profile <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
