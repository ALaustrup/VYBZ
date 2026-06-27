import type { Room, RoomMessage } from "@/types";

// Fallback room list used in local mode (no backend). Mirrors the seeded rows
// in supabase/schema.sql so the feature looks identical offline.
export const FALLBACK_ROOMS: Room[] = [
  { id: "lobby", name: "The Lobby", topic: "Anything goes — say hi.", kind: "public", sort: 0 },
  { id: "live", name: "Confessions Live", topic: "React to fresh secrets together.", kind: "public", sort: 1 },
  { id: "latenight", name: "Late Night", topic: "For the 3am thoughts.", kind: "public", sort: 2 },
  { id: "vent", name: "Vent", topic: "Let it out, no judgment.", kind: "public", sort: 3 },
  { id: "hype", name: "Hype", topic: "Gas each other up.", kind: "public", sort: 4 },
  { id: "confessions", name: "Confessions", topic: "Say the thing out loud.", kind: "public", sort: 5 },
];

// MYVYB starts brand new — rooms open empty and fill with real conversation.
export const SEED_ROOM_MESSAGES: Record<string, RoomMessage[]> = {};

// Disclosed moderation-agent voice. Used by the local simulator; the live agent
// (Edge Function) carries its own copy server-side.
export const MOD_TIPS: string[] = [
  "Reminder: you can report any message or block anyone from the ⋯ menu. Reports are reviewed.",
  "Photos here are clear by default. Anything flagged sensitive is blurred until you tap to reveal it — just for you.",
  "Keep it anonymous: don't share personal contact info you wouldn't want public.",
  "If a conversation gets heavy and you're struggling, you're not alone — call or text 988 (US) or find a helpline at findahelpline.com.",
  "Be excellent to each other. Harassment and hate get people banned.",
];
