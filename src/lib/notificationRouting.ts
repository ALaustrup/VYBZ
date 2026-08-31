import type { AppNotification, NotificationKind } from "@/types";

/** Kinds routed to Chat — never Alerts or /notifications. */
export const CHAT_NOTIFICATION_KINDS = new Set<NotificationKind>(["message"]);

export function isChatNotification(n: Pick<AppNotification, "kind">): boolean {
  return CHAT_NOTIFICATION_KINDS.has(n.kind);
}

export function isAlertsNotification(n: Pick<AppNotification, "kind">): boolean {
  return !isChatNotification(n);
}

export function filterAlertsNotifications(list: AppNotification[]): AppNotification[] {
  return list.filter(isAlertsNotification);
}
