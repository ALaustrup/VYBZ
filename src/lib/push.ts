import { savePushSubscription, deletePushSubscription } from "@/lib/backend";

// Web Push (browser) client. Designed so native (Capacitor APNs/FCM) can later
// register into the same `push_subscriptions` table via savePushSubscription.
//
// The VAPID *public* key is safe to ship. The matching private key lives only in
// the push-send Edge Function's secrets (never in the client/repo).
const VAPID_PUBLIC_KEY =
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ||
  "BOaKgJvpZPXrEBDq7tNIH4AgS98zQ9eb-FfXeaX15vURlvUzYADNMjb1dzsI4Jjt_wbplI8tzJmXfFPa9-UesRw";

const NEVER_KEY = "veiled.pushNeverAsk";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function pushPermission(): NotificationPermission {
  return pushSupported() ? Notification.permission : "denied";
}

/** Whether it's appropriate to softly ask (supported, undecided, not opted-out). */
export function canAskPush(): boolean {
  if (!pushSupported()) return false;
  if (Notification.permission !== "default") return false;
  try {
    return localStorage.getItem(NEVER_KEY) !== "1";
  } catch {
    return true;
  }
}

export function dontAskPushAgain(): void {
  try {
    localStorage.setItem(NEVER_KEY, "1");
  } catch {
    /* ignore */
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Request permission (if needed) and register a push subscription for this user.
 * Returns true on success. Safe to call repeatedly (idempotent by endpoint).
 */
export async function enablePush(userId: string): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const permission =
      Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
    if (permission !== "granted") {
      if (permission === "denied") dontAskPushAgain();
      return false;
    }
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      }));
    const json = sub.toJSON();
    if (!json.keys?.p256dh || !json.keys?.auth) return false;
    return savePushSubscription({
      userId,
      endpoint: sub.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      platform: "web",
    });
  } catch {
    return false;
  }
}

/** Unsubscribe this device + clean up the server row. */
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await deletePushSubscription(sub.endpoint);
      await sub.unsubscribe();
    }
  } catch {
    /* ignore */
  }
}
