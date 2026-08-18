import { ProfileLiveFeed } from "@/components/profile/ProfileLiveFeed";
import { WhosLivePanel } from "@/features/live/WhosLivePanel";

/** Active live hosts + alerts. */
export function DashLivePanel() {
  return (
    <div className="space-y-5">
      <WhosLivePanel />

      <div>
        <p className="eyebrow mb-2">Alerts</p>
        <ProfileLiveFeed />
      </div>
    </div>
  );
}
