/**
 * Static route → sticky app bar chrome (3B / chrome unification).
 * Pages override title/actions via useRegisterAppBar. No page-level H1/PageHeader.
 * Dark Smoke era: one-word titles; subtitles only when they add a single cue.
 */

export interface ChromeDef {
  title: string;
  subtitle?: string;
  /** Show back control (history or explicit path). */
  showBack?: boolean;
  backTo?: string;
}

export function chromeForPath(pathname: string): ChromeDef {
  if (pathname === "/") return { title: "Dashboard" };
  if (pathname.startsWith("/feed")) return { title: "Drops" };
  if (pathname.startsWith("/discover")) return { title: "Discover" };
  if (pathname.startsWith("/connect")) return { title: "Network" };
  if (pathname.startsWith("/spark")) return { title: "Spark" };
  if (pathname.startsWith("/opportunities")) return { title: "Roles" };
  if (pathname.startsWith("/projects/") && pathname !== "/projects") {
    return { title: "Repo", showBack: true, backTo: "/" };
  }
  if (pathname.startsWith("/projects")) return { title: "Studio", showBack: true, backTo: "/" };
  if (pathname.startsWith("/social")) return { title: "Social", showBack: true, backTo: "/?tab=live" };
  if (pathname.startsWith("/live/") && pathname !== "/live") {
    return { title: "Live", showBack: true, backTo: "/?tab=live" };
  }
  if (pathname.startsWith("/live")) return { title: "Live", showBack: true, backTo: "/?tab=live" };
  if (pathname.startsWith("/messages/")) return { title: "Messages", showBack: true, backTo: "/?tab=you" };
  if (pathname.startsWith("/messages")) return { title: "Messages", showBack: true, backTo: "/?tab=you" };
  if (pathname.startsWith("/rooms/") && pathname !== "/rooms") {
    return { title: "Room", showBack: true, backTo: "/" };
  }
  if (pathname.startsWith("/rooms")) return { title: "Rooms", showBack: true, backTo: "/" };
  if (pathname.startsWith("/profile/edit")) {
    return { title: "Edit", showBack: true, backTo: "/?tab=you" };
  }
  if (pathname.startsWith("/profile")) return { title: "You" };
  if (pathname.startsWith("/u/")) return { title: "Profile", showBack: true, backTo: "/" };
  if (pathname.startsWith("/artist/")) return { title: "Artist", showBack: true, backTo: "/" };
  if (pathname.startsWith("/p/")) return { title: "Project", showBack: true, backTo: "/" };
  if (pathname.startsWith("/store")) {
    return { title: "Flair", showBack: true, backTo: "/" };
  }
  if (pathname.startsWith("/admin")) return { title: "Admin", showBack: true, backTo: "/" };
  if (pathname.startsWith("/mod")) return { title: "Mod", showBack: true, backTo: "/" };
  if (pathname.startsWith("/apply-mod")) {
    return { title: "Apply", showBack: true, backTo: "/" };
  }
  if ((pathname.startsWith("/codex/") && pathname !== "/codex") || pathname.startsWith("/legal/")) {
    return { title: "Codex", showBack: true, backTo: "/codex" };
  }
  if (pathname.startsWith("/codex") || pathname.startsWith("/legal")) return { title: "Codex", showBack: true, backTo: "/" };
  if (pathname.startsWith("/library")) return { title: "Library", showBack: true, backTo: "/?tab=you" };
  if (pathname.startsWith("/visuals/tutorial")) {
    return { title: "Visualizer", showBack: true, backTo: "/" };
  }
  if (pathname.startsWith("/visuals/studio")) {
    return { title: "Studio", showBack: true, backTo: "/visuals/tutorial" };
  }
  return { title: "VYBZ" };
}
