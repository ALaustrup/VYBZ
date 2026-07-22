/**
 * Static route → sticky app bar chrome (3B).
 * Pages can override title/actions via useRegisterAppBar.
 */

export interface ChromeDef {
  title: string;
  subtitle?: string;
  /** Show back control (history or explicit path). */
  showBack?: boolean;
  backTo?: string;
}

export function chromeForPath(pathname: string): ChromeDef {
  if (pathname === "/") return { title: "Drops", subtitle: "Fresh sound from the network" };
  if (pathname.startsWith("/discover")) return { title: "Discover" };
  if (pathname.startsWith("/activity")) return { title: "Activity" };
  if (pathname.startsWith("/connect")) {
    return { title: "Connect", subtitle: "Creators who complement your craft" };
  }
  if (pathname.startsWith("/spark")) return { title: "Spark", showBack: true, backTo: "/connect" };
  if (pathname.startsWith("/opportunities")) {
    return { title: "Opportunities", showBack: true, backTo: "/connect" };
  }
  if (pathname.startsWith("/projects/") && pathname !== "/projects") {
    return { title: "Collab room", showBack: true, backTo: "/projects" };
  }
  if (pathname.startsWith("/projects")) return { title: "Studio" };
  if (pathname.startsWith("/live/") && pathname !== "/live") {
    return { title: "Live", showBack: true, backTo: "/live" };
  }
  if (pathname.startsWith("/live")) return { title: "Live" };
  if (pathname.startsWith("/messages/")) return { title: "Messages", showBack: true, backTo: "/messages" };
  if (pathname.startsWith("/messages")) return { title: "Messages" };
  if (pathname.startsWith("/rooms/") && pathname !== "/rooms") {
    return { title: "Room", showBack: true, backTo: "/rooms" };
  }
  if (pathname.startsWith("/rooms")) return { title: "Rooms" };
  if (pathname.startsWith("/profile/edit")) {
    return { title: "Edit profile", showBack: true, backTo: "/profile" };
  }
  if (pathname.startsWith("/profile")) return { title: "You" };
  if (pathname.startsWith("/u/")) return { title: "Creator", showBack: true };
  if (pathname.startsWith("/artist/")) return { title: "Artist", showBack: true };
  if (pathname.startsWith("/p/")) return { title: "Project", showBack: true };
  if (pathname.startsWith("/store")) return { title: "Store" };
  if (pathname.startsWith("/admin")) return { title: "Admin" };
  if (pathname.startsWith("/mod")) return { title: "Moderate" };
  if (pathname.startsWith("/apply-mod")) return { title: "Apply", showBack: true, backTo: "/profile" };
  if (pathname.startsWith("/codex") || pathname.startsWith("/legal")) return { title: "Codex" };
  return { title: "VYBZ" };
}
