import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  checkInAppUpdate,
  shouldPromptFlexibleUpdate,
  startFlexibleInAppUpdate,
  type InAppUpdateInfo,
} from "@/platform/android/inAppUpdate";

/** Banner when Play reports a newer beta-track build (flexible update). */
export function InAppUpdateBanner() {
  const [info, setInfo] = useState<InAppUpdateInfo | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void checkInAppUpdate().then((next) => {
      if (!cancelled) setInfo(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!info || !shouldPromptFlexibleUpdate(info)) return null;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-suite border border-sky-400/30 bg-sky-400/10 px-4 py-3"
      data-testid="in-app-update-banner"
      role="status"
    >
      <div>
        <p className="text-sm font-medium text-snow">Update available</p>
        <p className="text-xs text-fog">
          Beta track · build {info.availableVersionCode} · flexible install
        </p>
      </div>
      <Button
        size="sm"
        data-testid="in-app-update-start"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void startFlexibleInAppUpdate().finally(() => setBusy(false));
        }}
      >
        Update
      </Button>
    </div>
  );
}
