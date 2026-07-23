/**
 * Static route → sticky app bar chrome (3B / chrome unification).
 * Pages override title/actions via useRegisterAppBar. No page-level H1/PageHeader.
 */

export interface ChromeDef {
  title: string;
  subtitle?: string;
  /** Show back control (history or explicit path). */
  showBack?: boolean;
  backTo?: string;
}

export function chromeForPath(pathname: string): ChromeDef {
  if (pathname === "/") return { title: "Home", subtitle: "Drops from the network" };
  if (pathname.startsWith("/discover")) {
    return { title: "Network", subtitle: "Search by craft, role, genre, DAW & place" };
  }
  if (pathname.startsWith("/activity")) return { title: "Activity" };
  if (pathname.startsWith("/connect")) {
    return { title: "Network", subtitle: "Ranked collaborators for your craft" };
  }
  if (pathname.startsWith("/spark")) {
    return { title: "Network", subtitle: "Swipe the same match deck" };
  }
  if (pathname.startsWith("/opportunities")) {
    return { title: "Network", subtitle: "Roles ranked for what you offer" };
  }
  if (pathname.startsWith("/projects/") && pathname !== "/projects") {
    return { title: "Collab", showBack: true, backTo: "/projects" };
  }
  if (pathname.startsWith("/projects")) {
    return { title: "Studio", subtitle: "Collabs needing you, then catalog releases" };
  }
  if (pathname.startsWith("/live/") && pathname !== "/live") {
    return { title: "Live", showBack: true, backTo: "/live" };
  }
  if (pathname.startsWith("/live")) return { title: "Live", subtitle: "Who’s on right now" };
  if (pathname.startsWith("/messages/")) return { title: "Messages", showBack: true, backTo: "/messages" };
  if (pathname.startsWith("/messages")) return { title: "Messages" };
  if (pathname.startsWith("/rooms/") && pathname !== "/rooms") {
    return { title: "Room", showBack: true, backTo: "/rooms" };
  }
  if (pathname.startsWith("/rooms")) {
    return { title: "Rooms", subtitle: "Role, genre & DAW chats" };
  }
  if (pathname.startsWith("/profile/edit")) {
    return { title: "Edit profile", subtitle: "Identity, roles & matching", showBack: true, backTo: "/profile" };
  }
  if (pathname.startsWith("/profile")) return { title: "You" };
  if (pathname.startsWith("/u/")) return { title: "Creator", showBack: true };
  if (pathname.startsWith("/artist/")) return { title: "Artist", showBack: true };
  if (pathname.startsWith("/p/")) return { title: "Project", showBack: true };
  if (pathname.startsWith("/store")) {
    return { title: "Store", subtitle: "Accents & flair — never pay-to-win", showBack: true, backTo: "/profile" };
  }
  if (pathname.startsWith("/admin")) return { title: "Admin" };
  if (pathname.startsWith("/mod")) return { title: "Moderate" };
  if (pathname.startsWith("/apply-mod")) return { title: "Apply", showBack: true, backTo: "/profile" };
  if (pathname.startsWith("/codex") || pathname.startsWith("/legal")) return { title: "Codex" };
  return { title: "VYBZ" };
}
