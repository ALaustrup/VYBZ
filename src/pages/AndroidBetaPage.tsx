import { UploadQueuePanel } from "@/features/sync/UploadQueuePanel";
import { InAppUpdateBanner } from "@/features/android/InAppUpdateBanner";

/** Android Beta surface — upload queue + in-app update prompt. */
export function AndroidBetaPage() {
  return (
    <main
      className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-6"
      data-testid="android-beta-page"
    >
      <header>
        <h1 className="font-display text-2xl text-snow" data-testid="android-beta-title">
          Android Beta
        </h1>
        <p className="mt-1 text-sm text-fog">
          Play-ready uploads, deep links, and flexible updates.
        </p>
      </header>
      <InAppUpdateBanner />
      <UploadQueuePanel />
    </main>
  );
}
