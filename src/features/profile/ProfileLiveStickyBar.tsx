import { ArrowUp, Radio } from "lucide-react";

export function ProfileLiveStickyBar({
  visible,
  displayName,
  isOwner,
  onReturn,
}: {
  visible: boolean;
  displayName: string;
  isOwner: boolean;
  onReturn: () => void;
}) {
  if (!visible) return null;

  const name = displayName || "Creator";
  const status = isOwner ? "Your VYBZ is live" : `${name} is live`;
  const returnLabel = isOwner ? "Return to your live stream" : `Return to ${name}'s live stream`;

  return (
    <div
      role="status"
      aria-live="off"
      data-testid="profile-live-sticky"
      className="border-b border-wild/25 bg-wild/10 px-4 py-2 sm:px-8"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-white/90">
          <Radio className="h-3.5 w-3.5 text-wild" aria-hidden />
          {status}
        </span>
        <button
          type="button"
          onClick={onReturn}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 text-[12px] font-medium text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300/70"
          aria-label={returnLabel}
        >
          <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Return to live
        </button>
      </div>
    </div>
  );
}
