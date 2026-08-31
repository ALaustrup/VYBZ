import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  filterAlertsNotifications,
  isAlertsNotification,
  isChatNotification,
} from "@/lib/notificationRouting";
import { GATE_REGISTRY, NOTIFICATION_ROUTING } from "@/product/invariants";
import type { AppNotification } from "@/types";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

function sample(kind: AppNotification["kind"]): AppNotification {
  return {
    id: "n1",
    kind,
    actorId: null,
    title: "t",
    body: null,
    refId: null,
    read: false,
    createdAt: 0,
  };
}

describe("notification routing — chat vs alerts", () => {
  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("notificationRouting");
  });

  it("keeps chat kinds separate from alerts in product law", () => {
    expect(NOTIFICATION_ROUTING.chatSeparateFromAlerts).toBe(true);
    expect(NOTIFICATION_ROUTING.chatKinds).toContain("message");
  });

  it("routes message kind to chat only", () => {
    expect(isChatNotification(sample("message"))).toBe(true);
    expect(isAlertsNotification(sample("message"))).toBe(false);
    expect(isChatNotification(sample("connection"))).toBe(false);
    expect(filterAlertsNotifications([sample("message"), sample("live")])).toHaveLength(1);
  });

  it("excludes message from alerts unread count and mark-read", () => {
    const api = read("src/lib/api.ts");
    expect(api).toContain("unreadChatNotificationCount");
    expect(api).toMatch(/unreadNotificationCount[\s\S]*neq\("kind", "message"\)/);
    expect(api).toMatch(/markNotificationsRead[\s\S]*neq\("kind", "message"\)/);
  });

  it("filters message out of alerts chrome surfaces", () => {
    expect(read("src/components/shell/AlertsMenu.tsx")).toContain("filterAlertsNotifications");
    expect(read("src/components/home/HubActivity.tsx")).toContain("filterAlertsNotifications");
    expect(read("src/pages/NotificationsPage.tsx")).toContain("filterAlertsNotifications");
    expect(read("src/components/shell/ChatIndicator.tsx")).toContain("unreadChatNotificationCount");
  });

  it("keeps must-ack wall alerts off chat notifications", () => {
    const wall = read("src/components/home/WallAlerts.tsx");
    expect(wall).toContain("isChatNotification");
    expect(wall).not.toMatch(/isMustAckNotification[\s\S]*kind === "message"/);
  });
});
